# 17 — Order Idempotency Design

**Design only. Not implemented, not applied to the remote project, and `create-order`'s deployed
behavior (version 2, audited in 11-edge-function-audit.md) is unchanged.** This directly addresses
the single most concrete defect found in that audit: a retried request currently creates a second,
distinct order and decrements stock a second time, because `orderId = crypto.randomUUID()` is
generated fresh on every invocation with no dedup check (11-edge-function-audit.md, "Replay
protection / idempotency" row).

**Revision history:**

- 2026-08-01 (Foundation Closure pass) — original design.
- 2026-08-01 (Foundation Evidence Reconciliation pass) — schema location, crash-window handling,
  atomic retry acquisition, rollout compatibility, retention, data minimization.
- 2026-08-01 (Foundation Artifact Preservation and Final Design Correction pass) — corrected a
  transaction-rollback contradiction (Problem A: the exception handler's own
  `update ... status = 'failed'` was undone by its own `raise;`), split the previous single
  combined function into a two-phase claim/complete design to correctly sequence the Storage slip
  upload between them (Problem B), added a `unique (operation, order_id)` constraint (Problem C),
  added stale-`processing` recovery via `processing_started_at` (Problem D), and added explicit
  function-privilege grants (Problem E).
- 2026-08-01 (Foundation Correction Commit and Local-Execution Preparation pass) — this revision.
  Corrects five further defects found in the previous revision's own corrected design: (1) the
  `failed → processing` compare-and-swap could silently overwrite `request_hash`, letting a
  changed-payload "retry" masquerade as a legitimate one — `request_hash` is now immutable after
  first write, enforced by both function logic and a trigger; (2) `complete_order_for_claim` guarded
  its update only by `(operation, key)`, not by which specific attempt was doing the completing — a
  new `attempt_id` column and ownership check now make completion conditional on the exact attempt
  that is still active; (3) the stale-processing recovery operation is now a single proper function
  with explicit compare-and-swap semantics, rather than a raw example `update` statement; (4) the
  blanket "every `P0001` means `OUT_OF_STOCK`" error mapping is corrected — it was never verified
  against `create_order`'s actual internal exception behavior and could mislabel non-stock failures
  as retryable; (5) the Storage-consistency section is expanded to cover existing-object reuse
  verification, retry-with-different-file behavior, abandoned-slip cleanup, and how attempt
  ownership interacts with the Storage path.

**Status: Design Corrected — Not Implemented — Awaiting Approval.**

## Relationship to guest-order-ownership (decision 1 / Phase 12)

This design is **deliberately ownership-model-agnostic**. Whichever of Option A/B/C
(09-foundation-decisions.md) is eventually approved, idempotency keys are scoped by
`(operation, key)` only — never by `user_id` or a session — because `create-order` runs entirely
under `service_role` regardless of the customer's identity model. The two concerns are independent
and should stay that way: idempotency prevents *duplicate processing of the same attempt*; the
ownership decision governs *who can later look up or act on the resulting order*.

## Schema

```sql
create table private.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  operation text not null,
  key uuid not null,
  request_hash text not null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  order_id uuid not null,
  -- New this pass (Problem B/attempt-ownership). Identifies exactly which
  -- claim-or-retry "attempt" currently owns this row while it is
  -- `processing`. Regenerated on every fresh claim and on every won retry.
  -- complete_order_for_claim only writes a `completed`/`failed` outcome for
  -- the attempt whose attempt_id still matches — see Problem B below.
  attempt_id uuid not null default gen_random_uuid(),
  processing_started_at timestamptz not null default now(),
  error_code text,
  response_snapshot jsonb,
  request_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  unique (operation, key),
  unique (operation, order_id)
);

alter table private.idempotency_keys enable row level security;
-- No policies added: `private` is not exposed to the Data API by default (only `public`/
-- `graphql_public` are, per this project's own skill guidance and consistent with
-- private.is_admin() already living unexposed in this schema — 12-rls-and-authorization-audit.md).
-- This table is written and read exclusively by the create-order edge function via service_role,
-- which bypasses RLS entirely regardless of schema. RLS is still enabled per this project's own
-- rls_auto_enable event-trigger convention (deny-by-default even though nothing currently needs a
-- policy, and even though `private` is already unexposed — defense in depth costs nothing here).

create index idempotency_keys_expires_at_idx
  on private.idempotency_keys (expires_at)
  where status <> 'processing';

create index idempotency_keys_order_id_idx
  on private.idempotency_keys (order_id);

-- Supports the stale-processing recovery scan described under Problem D below.
create index idempotency_keys_processing_started_at_idx
  on private.idempotency_keys (processing_started_at)
  where status = 'processing';

-- New this pass (Problem A hardening). request_hash must never change after
-- it is first written by claim_idempotency_key — every subsequent function
-- in this design (the retry CAS, completion, recovery) relies on that
-- invariant to decide whether a request is a legitimate retry or a
-- key-reuse-with-different-payload attempt. Enforcing it only "by
-- convention" (no function happens to update it) was judged insufficient —
-- a future function or a manual `update` run by an operator could silently
-- violate it. A trigger makes the invariant structural, matching this
-- project's existing pattern of using triggers to own a column outright
-- (see profiles_set_updated_at on public.profiles).
create or replace function private.enforce_idempotency_key_hash_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.request_hash is distinct from old.request_hash then
    raise exception 'request_hash on private.idempotency_keys is immutable after creation'
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end;
$$;

create trigger idempotency_keys_hash_immutable
  before update on private.idempotency_keys
  for each row
  execute function private.enforce_idempotency_key_hash_immutable();
```

**Reasoning for `private` schema (unchanged from the prior revision):** no evidenced reason was
found for this table to be reachable via the Data API at all — it is read and written exclusively by
`create-order`'s `service_role` connection, never by a customer or admin client directly. Keeping it
in `private` removes an entire class of "what if `anon`/`authenticated` grants ever get added
accidentally" risk that a `public`-schema table would carry.

## Order ID generated and stored at claim time

1. The edge function generates `const orderId = crypto.randomUUID()` **before** the claim insert.
2. The claim insert stores it immediately: `order_id` is `not null` in the schema above — every row,
   from the moment it's created, records which order UUID this attempt is claiming.
3. The exact same `orderId` is passed as an explicit argument to `create_order` (its signature
   already accepts `p_order_id` per `database.types.ts` — `create_order(p_order_id: string, ...)` —
   so this requires no RPC signature change).
4. This is what makes crash reconciliation possible: given a stale `processing` row, its `order_id`
   can be looked up directly in `public.orders` to determine whether that specific order actually
   committed.

## Problem C — one order per idempotency key, enforced

**Unchanged from the prior revision.** The schema above retains `unique (operation, order_id)`.
Reasoning: `order_id` is generated fresh (`crypto.randomUUID()`) exactly once per *new* claim (a
retry of an existing key reuses the already-stored `order_id` via `update`, never a new `insert`),
so under correct application logic one order UUID should never appear in more than one
idempotency-key row. A database-level unique constraint turns "the application never does this"
into "the application cannot do this even if a future bug tries to" — a second claim attempt that
accidentally reused an `order_id` (e.g., a coding error that generated the UUID outside the
per-request scope) fails loudly at the constraint instead of silently creating two idempotency rows
that both claim to own the same order, which would make "which key does this order actually belong
to" ambiguous for support lookups and reconciliation. One order is never legitimately connected to
multiple idempotency keys in this design; the constraint enforces that as an invariant rather than a
convention. `attempt_id` (new this pass) does not change this reasoning — it identifies *which
attempt at the same key/order* is currently active, not a relationship between different orders and
keys.

## Claim-before-upload flow (Problem B)

**Selected design (unchanged from the prior revision): Option 1 (claim before upload) combined with
Option 2 (deterministic slip path).**

```text
1. Validate lightweight request (structural only: required fields present, types correct,
   payment method recognized, item list non-empty — no database access, no Storage access).
2. Deterministic pre-check (new this pass, see Problem D "error mapping" below): look up the
   referenced product(s) in public.products and validate existence, active status, and requested
   quantity shape. Read-only, no claim yet. A failure here is rejected immediately — no idempotency
   row is ever created for a deterministic validation failure (unchanged principle from the prior
   revision, now made concrete for these specific error codes).
3. Claim the idempotency key — private.claim_idempotency_key(...) (standalone function, see below).
   This is a single atomic insert; it does not touch Storage or call create_order.
   - If this returns "claimed" (first attempt, or a CAS-won retry of a failed key): continue to
     step 4. The returned row's attempt_id must be retained by the caller — it is required by
     complete_order_for_claim in step 6.
   - If this returns "collision": branch on the existing row's status without raising an
     exception (see Concurrency behavior below) — no Storage or order-creation work happens on
     this path at all.
4. Compute the deterministic slip path from the already-claimed order_id:
   payment-slips/{order_id}/original.{validated_extension}
5. Upload the slip to that deterministic path with upsert:false (non-overwriting).
   - Normal case (first attempt for this key): upload succeeds.
   - Retry case (same key, same claimed order_id, prior upload already happened): the object
     already exists at that exact path — Storage returns an "already exists" error. See "Storage
     consistency" below for how this is verified before being treated as reuse.
6. Call private.complete_order_for_claim(..., p_attempt_id => <the attempt_id from step 3>) —
   wraps create_order and the completion/failure update in one transaction, guarded by attempt
   ownership (Problem A/B below).
7. Return the structured result from step 6 as the HTTP response.
```

**Recovery when upload succeeds but order creation fails (step 5 succeeds, step 6 fails):** the
claim row is marked `failed` by `complete_order_for_claim`'s own exception handling (Problem A). The
slip object at the deterministic path is *not* deleted — a subsequent retry (CAS `failed` →
`processing`, same key, same `order_id`, same `request_hash`) recomputes the identical deterministic
path, finds the object already there, and treats that as step-5 success without re-uploading, then
proceeds directly to step 6 again with a **new** `attempt_id`. No orphan accumulates across retries
of the *same* key, because every retry converges on the same path. An orphan can still occur if the
client abandons the flow entirely after step 5 without ever retrying — see "Storage consistency"
below for how this is now addressed (it was previously an acknowledged, unaddressed gap).

**Why claiming before uploading is necessary and sufficient:** the claim insert is the only
operation in this entire flow protected by a database unique index (`operation, key`), so it is the
only point that can correctly serialize concurrent duplicate requests. Performing it first means no
duplicate request can reach the Storage call at all — the second of two concurrent identical
requests receives its collision result at step 3, before any Storage or order-creation side effect
has been attempted.

## Problem A — immutable request hash and corrected failed-status handling

### A1 — request hash must be immutable (new this pass)

**Defect in the previous revision:** the retry compare-and-swap unconditionally overwrote
`request_hash` with whatever hash the retry request supplied:

```sql
-- Previous, defective version:
update private.idempotency_keys
set status = 'processing',
    request_hash = $2,   -- overwrites the ORIGINAL hash with the new request's hash
    ...
where operation = $1 and key = $4 and status = 'failed'
returning *;
```

This meant a request reusing an existing key with a **different payload** — e.g., a different item
list or a different customer address — while the prior attempt happened to be sitting in `failed`,
would be silently treated as a legitimate retry: the CAS would win, the stored `request_hash` would
be replaced by the new payload's hash, and a second, different order could be created under a key
that was supposed to guarantee "this exact request happens at most once." This directly undermines
the entire idempotency guarantee for exactly the case (`failed` status) where a legitimate retry is
otherwise expected to work.

**Corrected design:** `request_hash` is set once, at the initial claim, and never updated again —
enforced structurally by the `idempotency_keys_hash_immutable` trigger in the schema above, not just
by careful function-writing. The retry path now requires the incoming request's hash to match the
stored hash as a precondition of the CAS itself (see `private.retry_idempotency_key` below); a
mismatch is classified as `IDEMPOTENCY_KEY_REUSED`, not silently accepted as a retry.

### A2 — corrected failed-status handling (no raise-after-update, unchanged reasoning from the prior revision)

**Defect (prior-to-prior revision):** the earlier `claim_and_create_order` function's exception
handler did:

```sql
exception
  when others then
    update private.idempotency_keys
    set status = 'failed'
    where operation = p_operation and key = p_key and status = 'processing';
    raise;
```

In PL/pgSQL, an `exception` block runs inside an implicit subtransaction (savepoint) scoped to that
`begin ... exception ... end` block — but `raise;` re-raises the caught error out of the *function
itself*. Because Postgres functions called via a single RPC run inside the caller's own transaction
(one Supabase RPC call = one transaction, by default, with no explicit `commit` available inside
`plpgsql`), an unhandled exception propagating out of the function aborts that entire transaction.
The `update ... set status = 'failed'` executed inside the handler is **not** independently
committed by the subtransaction — subtransactions can only roll back to their savepoint, they cannot
commit ahead of their enclosing transaction. So that design's own "mark it failed" write was undone
by its own `raise;`, leaving the row silently stuck in `processing` forever on every genuine failure.

**Corrected design (retained from the prior revision):** `complete_order_for_claim` never re-raises.
It catches the error, writes the `failed` status itself, and **returns** a structured failure result
— allowing the function to complete normally, so the enclosing transaction commits (including the
`failed` write) rather than aborting.

### Problem B — attempt ownership guard (new this pass)

**Defect in the previous revision:** `complete_order_for_claim` guarded both its success and failure
updates only by `where operation = p_operation and key = p_key` — it did not check `order_id` or
which specific attempt was doing the completing. Combined with the new stale-processing recovery
function (Problem D), this created a real hazard: if a row is recovered (reclassified from
`processing` to `failed` or `completed` by the recovery job because its lease appeared stale) and a
new attempt then claims and completes the key, the **original, no-longer-current attempt** — if its
`create-order` invocation was merely slow rather than actually dead, and it eventually resumes
execution and calls `complete_order_for_claim` — could still match `(operation, key)` and overwrite
the row that the recovery job or the newer attempt had already settled, potentially re-marking a
`completed` row or clobbering a newer attempt's outcome.

**Corrected design:** every update `complete_order_for_claim` performs is now additionally guarded by
`order_id`, `status = 'processing'`, and `attempt_id = p_attempt_id` — i.e., the exact lease this
call believes it is holding. `p_attempt_id` is a new required parameter, supplied by the caller from
whatever `attempt_id` it received from `claim_idempotency_key` or `retry_idempotency_key`. If zero
rows match (because the row's `attempt_id` no longer matches — it has been superseded by recovery or
a newer retry — or its `status` is no longer `processing`), the update affects nothing and the
function returns a distinct `ATTEMPT_SUPERSEDED` result rather than silently succeeding or silently
overwriting another attempt's outcome. Exactly one row is expected to match under normal operation;
zero is the only other possible outcome (the unique constraints already rule out more than one).

```sql
create or replace function private.complete_order_for_claim(
  p_operation text,
  p_key uuid,
  p_order_id uuid,
  p_attempt_id uuid,
  p_customer jsonb,
  p_items jsonb,
  p_payment_method text,
  p_slip_path text,
  p_whatsapp_message text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_sqlstate text;
  v_error_code text;
  v_retryable boolean;
  v_rows_updated int;
begin
  begin
    v_result := public.create_order(
      p_order_id, p_customer, p_items, p_payment_method, p_slip_path, p_whatsapp_message
    );

    update private.idempotency_keys
    set status = 'completed', response_snapshot = v_result, completed_at = now()
    where operation = p_operation
      and key = p_key
      and order_id = p_order_id
      and status = 'processing'
      and attempt_id = p_attempt_id;

    get diagnostics v_rows_updated = row_count;

    if v_rows_updated = 0 then
      -- The order was created by THIS call (v_result exists — it is not
      -- orphaned data), but this specific attempt's lease no longer matches
      -- the row (superseded by stale-processing recovery or a newer retry).
      -- Surfaced distinctly so a superseded attempt can never be mistaken
      -- for an ordinary success by whatever code path receives this result.
      return jsonb_build_object(
        'success', false,
        'error_code', 'ATTEMPT_SUPERSEDED',
        'retryable', false,
        'order_id', p_order_id
      );
    end if;

    return jsonb_build_object('success', true, 'result', v_result);
  exception
    when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate;

      -- See "Problem D — stable error mapping" below for why P0001 no
      -- longer maps directly to OUT_OF_STOCK. The raw exception message
      -- (which may contain internal details such as constraint names or
      -- column values) is never stored or returned — only the mapped code.
      case v_sqlstate
        when '23505' then v_error_code := 'DUPLICATE'; v_retryable := false;
        when 'P0001' then v_error_code := 'ORDER_VALIDATION_FAILED'; v_retryable := false;
        else v_error_code := 'ORDER_CREATION_FAILED'; v_retryable := false;
      end case;

      -- Same attempt-ownership guard as the success path. If this attempt
      -- has already been superseded, this update simply affects zero rows
      -- (the row already reflects whatever the recovery job or a newer
      -- attempt decided) rather than clobbering it with a stale failure.
      update private.idempotency_keys
      set status = 'failed', error_code = v_error_code
      where operation = p_operation
        and key = p_key
        and order_id = p_order_id
        and status = 'processing'
        and attempt_id = p_attempt_id;

      return jsonb_build_object(
        'success', false,
        'error_code', v_error_code,
        'retryable', v_retryable
      );
  end;
end;
$$;
```

The edge function converts this structured result into the correct HTTP response (e.g.,
`success: false, error_code: 'ORDER_VALIDATION_FAILED', retryable: false` → `422`;
`error_code: 'ATTEMPT_SUPERSEDED'` → `409`, since the client should treat this like any other
in-progress/contended state and re-poll or retry with the same key rather than assume failure;
`error_code: 'ORDER_CREATION_FAILED', retryable: false` → `500` with a generic message). The raw
Postgres error text is available only in the database's own server-side logs (via Postgres's normal
error logging, not via anything this function returns or stores), never in `error_code` or in any
client-facing response.

**Deterministic validation failures — replayable-as-failed, not silently retryable, and ideally
never reach this function at all:** two different kinds of failure need to be told apart:

- **Transient, state-dependent failures** (genuine stock races — see Problem D below) are correctly
  modeled as `status = 'failed'` + `retryable = true`: a later retry with the same key may
  legitimately succeed once stock changes, and the atomic CAS `failed → processing` transition (see
  `private.retry_idempotency_key` below) lets that retry proceed safely, provided its `request_hash`
  still matches (Problem A1).
- **Deterministic validation failures** (malformed payload shape, unrecognized payment method, empty
  item list, unknown/inactive product, invalid quantity) do not depend on any state that could change
  between attempts — retrying with an identical payload will always fail identically. These are now
  rejected by the **deterministic pre-check in step 2 of the claim-before-upload flow above, before
  the idempotency key is ever claimed at all** — so they never consume an idempotency-key row or
  reach `complete_order_for_claim` in the first place. If such a failure were nonetheless caught here
  (e.g., a pre-check gap, or a race between the pre-check and `create_order`'s own internal check —
  see Problem D below), it is still correctly recorded as `status = 'failed', retryable = false` — a
  client "retrying" an unfixable request should not be encouraged to keep hammering the same key, but
  the key itself is still safely replayable (it will just deterministically return the same rejection,
  since `request_hash` cannot change) rather than left in an ambiguous state.

## Retry acquisition — compare-and-swap, now hash-guarded and attempt-scoped

**Corrected this pass:** wrapped in a dedicated function rather than left as a raw SQL example, so the
hash-immutability precondition (Problem A1) and the follow-up classification (needed to distinguish
"someone else already retried this" from "this is a key-reuse-with-different-payload attempt") live
in one place, atomically.

```sql
create or replace function private.retry_idempotency_key(
  p_operation text,
  p_key uuid,
  p_request_hash text,
  p_request_id text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row private.idempotency_keys;
begin
  update private.idempotency_keys
  set status = 'processing',
      attempt_id = gen_random_uuid(),
      request_id = p_request_id,
      processing_started_at = now(),
      completed_at = null,
      error_code = null
  where operation = p_operation
    and key = p_key
    and status = 'failed'
    and request_hash = p_request_hash
  returning * into v_row;

  if v_row is not null then
    return jsonb_build_object('outcome', 'claimed', 'row', to_jsonb(v_row));
  end if;

  -- The CAS did not win. This follow-up read only classifies a state that
  -- has already settled — it cannot itself cause an incorrect transition,
  -- since it performs no write. Presence of a returned row from the update
  -- above remains the sole signal for "did this call win the retry."
  select * into v_row
  from private.idempotency_keys
  where operation = p_operation and key = p_key;

  if v_row is null then
    return jsonb_build_object('outcome', 'not_found');
  elsif v_row.status = 'failed' and v_row.request_hash is distinct from p_request_hash then
    return jsonb_build_object('outcome', 'key_reused', 'row', to_jsonb(v_row));
  else
    return jsonb_build_object('outcome', 'collision', 'row', to_jsonb(v_row));
  end if;
end;
$$;
```

Presence of a returned row from the `update` is still the only signal used to decide "did I win the
claim" — never a separate `select` followed by a separate `update`, which would reintroduce a
check-then-act race. The follow-up `select` only runs after the CAS has already failed, purely to
produce an accurate error classification for the caller.

## Standalone claim function

```sql
create or replace function private.claim_idempotency_key(
  p_operation text,
  p_key uuid,
  p_request_hash text,
  p_request_id text,
  p_order_id uuid
) returns private.idempotency_keys
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim private.idempotency_keys;
begin
  insert into private.idempotency_keys
    (operation, key, request_hash, status, request_id, order_id)
  values (p_operation, p_key, p_request_hash, 'processing', p_request_id, p_order_id)
  on conflict (operation, key) do nothing
  returning * into v_claim;

  if v_claim is null then
    select * into v_claim
    from private.idempotency_keys
    where operation = p_operation and key = p_key;
  end if;

  return v_claim;
end;
$$;
```

`attempt_id` is populated by the column default (`gen_random_uuid()`) on a genuine fresh insert. The
caller (edge function) distinguishes "I won the claim" from "collision" by checking whether the
returned row's `status = 'processing'` **and** its `request_id`/`attempt_id` match what it expects
for a call it just made — in practice, simplest as: track the `attempt_id` this call returns:
if this call performed the insert, that `attempt_id` is brand new and this caller is its sole owner;
if it observed an existing row instead, that `attempt_id` belongs to whichever attempt is or was
active, and this caller must branch per "Concurrency behavior" below rather than proceed to Storage
or `complete_order_for_claim`. Either way, whatever `attempt_id` is returned here (fresh or existing)
is the value that must later be passed to `complete_order_for_claim` if and only if this caller is
the one proceeding with that attempt.

## Problem D — processing timeout, stale-recovery, and stable error mapping

### D1 — processing timeout and stale-recovery (unchanged reasoning from the prior revision, function corrected this pass)

The claim (`private.claim_idempotency_key`) and the completion (`private.complete_order_for_claim`)
are two separate transactions, with a Storage API call (not SQL, cannot be wrapped in a Postgres
transaction) in between. A row can therefore legitimately sit in `processing` for the duration of the
Storage upload — and, if the edge function process is killed, crashes, or the platform times it out
mid-upload (before calling `complete_order_for_claim` at all), the row stays `processing`
indefinitely with no natural mechanism to ever change it. Recovery handling is required.

- **`processing_started_at`**: in the schema above; reset on every claim/retry.
- **Stale-processing timeout**: recommended **2 minutes** — comfortably longer than any expected
  Storage upload for a payment-slip-sized image, short enough that a genuinely stuck request has
  long since returned a client-side timeout error to the customer. **Not approved** — a
  recommendation, not a business decision already made, consistent with this document's treatment
  of the retention period below.
- **Recovery ownership**: no multi-worker lease token beyond `attempt_id` itself is needed for the
  recovery step, because the recovery operation (below) is a single atomic `update ... from (...)
  ... returning` statement, evaluated against one consistent statement-level snapshot — the same
  "presence of a returned row decides the outcome" pattern used for claim/retry acquisition. Two
  concurrent recovery scans (e.g., two overlapping cron runs) cannot both "recover" the same stale
  row, for the same reason two concurrent retries cannot both win the `failed → processing` CAS: the
  second scan's `update` simply matches zero rows for anything the first scan already transitioned
  out of `processing`.
- **Why a superseded attempt cannot complete after recovery, without any separate lease check in the
  recovery function itself:** once recovery transitions a row's `status` away from `processing`, the
  original attempt's later call to `complete_order_for_claim` — guarded by
  `status = 'processing' and attempt_id = p_attempt_id` (Problem B above) — matches zero rows and
  returns `ATTEMPT_SUPERSEDED`, regardless of whether it still believes it holds a valid
  `attempt_id`. The ownership guard on the *completion* side is what actually prevents a superseded
  attempt from completing; the recovery function does not need to independently verify "is a newer
  attempt already in flight," because a newer attempt already having claimed the row via
  `retry_idempotency_key` would have reset `processing_started_at = now()`, which means the recovery
  scan's own `processing_started_at < now() - p_stale_after` predicate would no longer match that row
  at all — a row that has been genuinely retried recently is never a candidate for recovery in the
  same pass.
- **Atomic recovery operation (corrected this pass — a proper function, not a raw example
  statement):**

```sql
create or replace function private.recover_stale_processing_idempotency_keys(
  p_stale_after interval default interval '2 minutes'
) returns setof private.idempotency_keys
language sql
security definer
set search_path = ''
as $$
  update private.idempotency_keys k
  set status = case when found.order_exists then 'completed' else 'failed' end,
      error_code = case when found.order_exists then null else 'STALE_PROCESSING_RECOVERED' end,
      completed_at = case when found.order_exists then now() else k.completed_at end,
      response_snapshot = case when found.order_exists then found.snapshot else k.response_snapshot end
  from (
    select
      k2.id as key_id,
      (o.id is not null) as order_exists,
      jsonb_build_object(
        'orderId', o.order_code, 'orderUuid', o.id, 'createdAt', o.created_at,
        'subtotal', o.subtotal, 'deliveryFee', o.delivery_fee, 'total', o.total,
        'currency', o.currency, 'items', o.items
      ) as snapshot
    from private.idempotency_keys k2
    left join public.orders o on o.id = k2.order_id
    where k2.status = 'processing'
      and k2.processing_started_at < now() - p_stale_after
  ) as found
  where k.id = found.key_id
  returning k.*;
$$;
```

  The `left join` (evaluated once, against a single consistent statement-level snapshot) is what lets
  one atomic statement correctly branch both ways: if `public.orders` already has a row for this
  key's `order_id` (the `create_order` call inside a dying attempt's `complete_order_for_claim` had
  actually already succeeded, but the process died before the `completed` update could run — a
  narrower variant of the same crash class), the row is recovered to `completed` with a backfilled
  `response_snapshot` instead of `failed` — marking it `failed` when the order in fact exists would
  let a client retry and attempt to create a *second* order for what is really an already-fulfilled
  attempt. Otherwise it is recovered to `failed` with `error_code = 'STALE_PROCESSING_RECOVERED'`, and
  a later retry of the same key proceeds through the ordinary `retry_idempotency_key` path.
- **Supporting index**: `idempotency_keys_processing_started_at_idx`, in the schema above.
- **Scheduling mechanism** (e.g., `pg_cron` vs. an external scheduler invoking this as a periodic
  RPC) is left unspecified here — an implementation detail, not a design decision.

### D2 — stable error mapping (corrected this pass)

**Defect in the previous revision:** `complete_order_for_claim`'s exception handler mapped **every**
`P0001` SQLSTATE to `error_code = 'OUT_OF_STOCK', retryable = true`. **[Unverified]** whether
`create_order` in fact only ever raises `P0001` for stock-related failures — this was never
independently confirmed against the deployed function's actual body in either this pass or the prior
one (doing so would require live introspection of the deployed function, which is out of scope for a
docs-only correction pass, and is not something this pass performed). If `create_order` also raises
`P0001` for other internal validation branches (e.g., a product that no longer exists, or is inactive,
or an invalid quantity that somehow reached the database layer), the previous mapping would have
mislabeled those as `OUT_OF_STOCK, retryable: true` — actively wrong, since telling a client "retry
this, it's just a stock issue" about a request that in fact references a nonexistent product would
produce a client that retries forever against a request that can never succeed.

**Corrected approach — split responsibility, without modifying `create_order`:**

1. **Deterministic checks move upstream, before any idempotency key is claimed.** Step 2 of the
   claim-before-upload flow above adds a read-only pre-check against `public.products` (existence,
   `active` status, and requested-quantity shape) for every referenced item, covering
   `PRODUCT_NOT_FOUND`, `PRODUCT_INACTIVE`, and `INVALID_QUANTITY` deterministically. Combined with
   the existing step-1 structural validation (`INVALID_PAYMENT_METHOD`, and, once delivery
   configuration exists as a concept, `INVALID_DELIVERY_CONFIGURATION`), this means these five codes
   are decided **before** `complete_order_for_claim` is ever called, and never consume an
   idempotency-key row on failure — consistent with the "deterministic failures never reach
   `complete_order_for_claim`" principle already established in Problem A.
2. **This narrows, but does not eliminate, what a `P0001` reaching `complete_order_for_claim` can
   mean.** A race remains possible between the step-2 pre-check and `create_order`'s own internal
   check (e.g., a product goes inactive or its stock changes in the milliseconds between them) — that
   is an inherent property of any check-then-act sequence across two separate statements, not a flaw
   specific to this design, and is exactly the kind of transient condition idempotency retries exist
   to handle.
3. **Until `create_order`'s exact per-branch SQLSTATE/message contract is independently verified,**
   `complete_order_for_claim` must not assume a `P0001` reaching it specifically means `OUT_OF_STOCK`.
   The corrected mapping used in the function body above is:
   - `23505` (unique_violation) → `DUPLICATE`, `retryable = false` (unchanged from the prior
     revision).
   - `P0001` → **`ORDER_VALIDATION_FAILED`**, `retryable = false`. Chosen deliberately conservative:
     since the deterministic cases should already have been caught upstream in step 2, a `P0001`
     reaching this point signals either the residual pre-check/`create_order` race described above or
     an upstream pre-check gap — in both cases, defaulting to non-retryable avoids telling a client to
     blindly retry a request that may in fact be permanently invalid.
   - anything else → `ORDER_CREATION_FAILED`, `retryable = false` (unchanged).
4. **Required before implementation, not performed in this pass:** directly read `create_order`'s
   deployed function body (e.g., via `list_tables`/`execute_sql` read-only introspection, or the
   Supabase dashboard) to determine whether it raises a distinguishable, stable signal specifically
   for out-of-stock conditions (a distinct custom SQLSTATE, or a stable message/`DETAIL` prefix). If
   it does, the mapping above should be refined to route that specific signal to `OUT_OF_STOCK,
   retryable: true` — this refinement is deferred pending that verification, not abandoned. If
   `create_order` does not currently expose a stable per-branch signal, the more durable long-term fix
   is to have `create_order` raise distinct custom SQLSTATEs (or return a structured `jsonb` result
   instead of raising for expected-shape failures) — a change to `create_order` itself, explicitly out
   of scope for this document (see "Migration impact" below, which still states zero changes to
   `create_order`'s signature/body).

**Stable codes this design now produces, and where each is decided:**

| Code | Decided where | Retryable |
|---|---|---|
| `PRODUCT_NOT_FOUND` | Step 2 pre-check (before claim) | N/A — request rejected before any key exists |
| `PRODUCT_INACTIVE` | Step 2 pre-check (before claim) | N/A |
| `INVALID_QUANTITY` | Step 2 pre-check (before claim) | N/A |
| `INVALID_PAYMENT_METHOD` | Step 1 structural validation (before claim) | N/A |
| `INVALID_DELIVERY_CONFIGURATION` | Step 1 structural validation (before claim) — **[Unverified]** whether delivery configuration exists as a distinct concept in the current `create_order`/checkout flow; included here to satisfy this document's own required code list, not confirmed against live behavior | N/A |
| `DUPLICATE` | `complete_order_for_claim` exception handler (`23505`) | false |
| `ORDER_VALIDATION_FAILED` | `complete_order_for_claim` exception handler (`P0001`, conservative mapping pending create_order verification) | false |
| `ORDER_CREATION_FAILED` | `complete_order_for_claim` exception handler (any other SQLSTATE) | false |
| `ATTEMPT_SUPERSEDED` | `complete_order_for_claim`, zero-row-match on completion (Problem B) | false — caller should treat as `409`/contended, not as a definitive failure |
| `IDEMPOTENCY_KEY_REUSED` | `retry_idempotency_key` / claim-collision branch (Problem A1) | N/A — request rejected, not a server-side failure |
| `IDEMPOTENCY_IN_PROGRESS` | Claim/retry collision branch, existing row still `processing` | N/A |
| `STALE_PROCESSING_RECOVERED` | `recover_stale_processing_idempotency_keys`, no matching order found | Implicitly yes — row becomes `failed`, a normal retry proceeds |
| `OUT_OF_STOCK` | **Not currently reachable** — retained as a documented target for the refinement in item 4 above, once `create_order`'s stock-failure signal is verified | true, once reachable |

## Problem E — function privileges

Every privileged function introduced by this design must be locked down to the service role that the
`create-order` edge function actually authenticates as. **[Unverified]** whether `create_order`'s own
existing grants already follow this exact pattern — not re-inspected in this pass; the grants below
should be made consistent with whatever `create_order` currently has, and any discrepancy found at
implementation time should be resolved in favor of the more restrictive of the two rather than
assumed away. `anon`, `authenticated`, `service_role`, and `public` are the standard
Supabase-provisioned Postgres roles; no project-specific role names are assumed here.

```sql
revoke all on function private.claim_idempotency_key(text, uuid, text, text, uuid) from public;
revoke all on function private.claim_idempotency_key(text, uuid, text, text, uuid) from anon;
revoke all on function private.claim_idempotency_key(text, uuid, text, text, uuid) from authenticated;
grant execute on function private.claim_idempotency_key(text, uuid, text, text, uuid) to service_role;

revoke all on function private.retry_idempotency_key(text, uuid, text, text) from public;
revoke all on function private.retry_idempotency_key(text, uuid, text, text) from anon;
revoke all on function private.retry_idempotency_key(text, uuid, text, text) from authenticated;
grant execute on function private.retry_idempotency_key(text, uuid, text, text) to service_role;

revoke all on function private.complete_order_for_claim(text, uuid, uuid, uuid, jsonb, jsonb, text, text, text) from public;
revoke all on function private.complete_order_for_claim(text, uuid, uuid, uuid, jsonb, jsonb, text, text, text) from anon;
revoke all on function private.complete_order_for_claim(text, uuid, uuid, uuid, jsonb, jsonb, text, text, text) from authenticated;
grant execute on function private.complete_order_for_claim(text, uuid, uuid, uuid, jsonb, jsonb, text, text, text) to service_role;

revoke all on function private.recover_stale_processing_idempotency_keys(interval) from public;
revoke all on function private.recover_stale_processing_idempotency_keys(interval) from anon;
revoke all on function private.recover_stale_processing_idempotency_keys(interval) from authenticated;
grant execute on function private.recover_stale_processing_idempotency_keys(interval) to service_role;
```

`private.enforce_idempotency_key_hash_immutable()` needs no explicit revoke/grant: like
`private.handle_new_user()` in the profiles migration, it `returns trigger`, which means it cannot be
invoked directly as a callable RPC/endpoint regardless of the default `PUBLIC` execute grant — only
fired by the trigger that references it.

All `security definer` functions above additionally carry `set search_path = ''`, carried over
unchanged from the existing `private.handle_new_user()` / `private.sync_user_email()` pattern in this
codebase, for the same search-path-injection-hardening reason. `security definer` here means these
functions do not depend on the caller separately holding table-level grants on
`private.idempotency_keys` or `public.orders`; the explicit `revoke`/`grant` pairs above are what
actually restrict *who may call the function at all*, independent of `security definer`/`invoker`.

**Recovery function execution note:** if `private.recover_stale_processing_idempotency_keys` is
scheduled via `pg_cron`, the job typically runs as the role that owns the cron job (commonly a
superuser role, which bypasses grants entirely) — the explicit `revoke`/`grant` above still applies
as defense-in-depth for any other call path (e.g., an external scheduler invoking it as an
authenticated RPC using a service-role key) and should not be omitted on the assumption that
`pg_cron` is definitely what will be used.

## Rollout compatibility

Do not introduce a mandatory `Idempotency-Key` header before the current frontend sends one. Explicit
sequence:

1. **Deploy the backend first**, accepting both legacy requests (no `Idempotency-Key` header) and
   idempotency-key requests. A missing header should not become a hard `400` at this stage — it
   should fall back to the pre-idempotency behavior (generate `orderId` fresh, no claim/dedup,
   upload slip to the existing non-deterministic path), identical to today's deployed behavior, so
   existing/cached frontend bundles continue to work unmodified during rollout.
2. **Deploy the frontend** generating and persisting a checkout-attempt key (e.g.,
   `crypto.randomUUID()` stored in component state for the duration of one checkout attempt) and
   sending it as `Idempotency-Key` on submit and retries.
3. **Monitor adoption** — e.g., log (server-side, structured) the proportion of `create-order`
   invocations arriving with vs. without the header, to confirm old cached frontend bundles have
   aged out.
4. **Make the header mandatory** (reject missing/malformed header with `400`) only once adoption
   monitoring in step 3 shows old clients are no longer meaningfully present. This is a business/
   operational timing decision, not a fixed date.

## Retention — explicit, not silently chosen

| Concern | Consideration | This design's position |
|---|---|---|
| Retry window | How long should a client's own retry (flaky network, page reload) still replay instead of erroring? | Realistically minutes, not days — but see below |
| Customer support window | How long should support staff be able to look up "what happened to this specific checkout attempt" via its key? | Potentially much longer than the retry window — days, not minutes |
| Cleanup schedule | How often does a job need to run to keep the table bounded? | Independent of the retention period itself — a daily job with a 7-day retention is as sound as an hourly job with a 1-day retention |
| Duplicate risk after expiry | If a client somehow retries with the same key *after* its row has been deleted, the claim insert succeeds again (no conflicting row exists) and a **second order would be created** | Retention must exceed any *plausible* client retry delay by a wide margin |
| Recommended retention period | — | **7 days** |
| Business approval status | — | **Not approved.** |
| Abandoned-slip coordination (new this pass) | A `failed` row whose deterministic Storage object was never claimed by a subsequent retry is an orphan candidate — see "Storage consistency" below | The same cleanup job that expires rows should also be responsible for the associated Storage object, so the two do not drift out of sync |

## Response storage — minimized

`response_snapshot` stores only what a legitimate replay needs to reproduce the original HTTP
response body: `orderId` (code), `orderUuid`, `createdAt`, `subtotal`, `deliveryFee`, `total`,
`currency`, `items` — i.e., exactly the fields `create-order` already returns to the client today
(11-edge-function-audit.md, "Returned order fields" row). Do **not** persist: signed Storage URLs or
any temporary Storage credentials; the customer's full input payload beyond what the response
already legitimately includes; anything resembling a secret. **Note (clarified this pass):**
`request_hash` is computed over structural request fields (customer/items/payment method/etc., after
normalization — see "Explicitly not designed here" below), **not** over the payment-slip file's raw
bytes — hashing an image file into a text column on every request was judged impractical. This has a
real, documented consequence: see "Storage consistency" below for what happens if a retry submits a
different slip file under the same key.

## Concurrency behavior

The claim insert (`on conflict (operation, key) do nothing returning *`, inside
`private.claim_idempotency_key`) is the sole concurrency control for the "has anyone already started
this attempt" question — Postgres resolves the race atomically at the unique-index level, the same
class of guarantee `create_order` already relies on for its `select ... for update` stock locks. No
advisory locks, no application-level mutex. Because the claim is now a standalone call (Problem B),
the caller must branch on its result *before* touching Storage:

- Returned row has `status = 'processing'` and this call performed the insert (fresh claim) →
  proceed to slip upload, using this call's `attempt_id`.
- Returned row has `status = 'processing'` and this call did **not** perform the insert (someone
  else's attempt is in flight) → `409 IDEMPOTENCY_IN_PROGRESS`, no Storage or order-creation work.
- Returned row has `status = 'completed'` → compare `request_hash`; if it matches, replay
  `response_snapshot`; if not, `409 IDEMPOTENCY_KEY_REUSED`.
- Returned row has `status = 'failed'` → call `private.retry_idempotency_key(...)`. If its outcome is
  `claimed`, proceed to slip upload using the **new** `attempt_id` it returns (reusing the
  deterministic path, per Problem B). If `collision`, `409 IDEMPOTENCY_IN_PROGRESS`. If `key_reused`,
  `409 IDEMPOTENCY_KEY_REUSED` — the stored `request_hash`, `order_id`, and any existing response
  information are unchanged by this outcome (Problem A1).

## Storage consistency (expanded this pass)

Storage and PostgreSQL are **not** one atomic transaction — this remains the central constraint the
entire claim-before-upload sequencing exists to work around, not something this design claims to have
eliminated.

- **How existing-object reuse is verified:** an "already exists" error on the deterministic path
  `payment-slips/{order_id}/original.{ext}` is treated as reuse because the path is derived 1:1 from
  this key's own `order_id`, which the Problem C unique constraint guarantees cannot be shared with
  any other idempotency key. **[Unverified]** whether the Supabase Storage client surfaces enough
  metadata on an "already exists" response (e.g., the existing object's size or a content hash) to
  cross-check against the current upload attempt without a separate request — if it does, that check
  should be added as a further defense-in-depth confirmation at implementation time; if not, the
  path-derivation guarantee above is considered sufficient on its own, since no other code path in
  this design ever writes to that exact path.
- **How file MIME/size is checked on retry:** validated at upload time (step 1/pre-step-5), the same
  way as the original attempt — this is unchanged from ordinary upload validation and is not
  idempotency-specific.
- **What happens if a retry submits a genuinely different file under the same key:** because
  `request_hash` does not cover the slip file's bytes (see "Response storage — minimized" above), and
  because the Storage upload is `upsert:false`, a retry that submits a different file than the
  original attempt will have that second file **silently rejected by Storage** (the "already exists"
  branch), and the **original** file remains the one associated with the order. This is a real,
  documented behavior of this design, not an oversight: allowing a same-key retry to replace an
  already-uploaded slip would reopen a duplicate-Storage-side-effect risk symmetrical to the one
  Problem B closes for the original upload. A customer who needs to correct a genuinely wrong slip
  upload must be handled as a distinct, explicit "amend my order" flow (out of scope for this
  document), not as an implicit side effect of retrying the same idempotency key.
- **How an abandoned slip is cleaned (previously an acknowledged, unaddressed gap — addressed this
  pass):** the same cleanup job responsible for deleting expired `private.idempotency_keys` rows
  (per the Retention table above) should, for each `failed` or expired row it processes, also attempt
  to delete the Storage object at that row's deterministic path (`payment-slips/{order_id}/original.*`)
  **only if** no row in `public.orders` matches that `order_id` — mirroring the same
  order-existence check the stale-processing recovery function already performs, so a slip belonging
  to a genuinely completed order is never deleted. This keeps Storage cleanup coordinated with, rather
  than independent of, the existing retention/expiry mechanism.
- **How attempt ownership applies to upload vs. completion:** the deterministic Storage path is scoped
  by `order_id` only, **not** by `attempt_id` — this is intentional, not an inconsistency. Every
  retry of the same key shares the same `order_id` (Problem C), so the path is deliberately
  attempt-independent: a new attempt must be able to find and reuse a prior attempt's already-uploaded
  object. `attempt_id` ownership matters only for the database-side completion step
  (`complete_order_for_claim`, Problem B), where a stale attempt must be prevented from writing a
  final status — it has no equivalent role at the Storage layer, where "does an object already exist
  at this exact path" is itself already a safe, order-scoped check.
- **How a stale prior attempt is prevented from completing after recovery:** covered under Problem
  D1 above (the `attempt_id`/`status = 'processing'` guard on `complete_order_for_claim`) — restated
  here because it is as much a Storage-flow concern (a slow upload that eventually returns after its
  attempt has been recovered) as a database one.

## Failure-behavior summary

| Scenario | Response | DB effect |
|---|---|---|
| First attempt, succeeds | Normal success body | One order, one stock decrement, key row `completed` |
| First attempt, deterministic validation failure (steps 1-2, pre-claim) | Normal error body (`PRODUCT_NOT_FOUND`/`PRODUCT_INACTIVE`/`INVALID_QUANTITY`/`INVALID_PAYMENT_METHOD`/`INVALID_DELIVERY_CONFIGURATION`) | No idempotency row ever created |
| First attempt, `P0001` reaches `complete_order_for_claim` (residual race or pre-check gap) | Error body, `error_code: 'ORDER_VALIDATION_FAILED'`, `retryable: false` | No order, key row `failed` |
| Retry, same key, same payload, prior = `completed` | Replayed original (minimized) success body | None — no new writes |
| Retry, same key, same payload, prior = `failed` | Reprocessed via `retry_idempotency_key` (hash matches) | Same as a fresh first attempt, new `attempt_id`; concurrent retries cannot both win |
| Retry, same key, different payload | `409 IDEMPOTENCY_KEY_REUSED` | None — stored `request_hash`/`order_id`/response data unchanged |
| Concurrent duplicate, prior = `processing` | `409 IDEMPOTENCY_IN_PROGRESS` | None |
| Completion arrives for an attempt already superseded by recovery or a newer retry | `409`, `error_code: 'ATTEMPT_SUPERSEDED'` | Order was created (not orphaned) but this attempt's own bookkeeping write is a no-op |
| Malformed/missing key, during rollout phase 1 | Falls back to legacy (no-dedup) behavior | Same as today's deployed behavior |
| Malformed/missing key, after key made mandatory | `400` | None |
| Crash/timeout during Storage upload, before `complete_order_for_claim` is called | Customer sees a client-side failure/timeout | Row stuck `processing` until stale-recovery (Problem D) reclassifies it as `failed` (or `completed`, if `public.orders` shows it actually succeeded) |
| Edge function crash after `complete_order_for_claim` returns, before HTTP response reaches client | N/A — client sees no response, but a retry with the same key correctly replays | Order + `completed` row — commit and completion are atomic within that function |
| Retry after Storage object already exists at the deterministic path (same file) | Treated as a successful re-upload, no new Storage write | Unchanged — same object reused |
| Retry with a genuinely different slip file under the same key | Original file remains associated with the order; second file rejected by Storage | Unchanged — no Storage overwrite, no new order |
| Client abandons flow after Storage upload succeeds, never retries | No further response expected | Row eventually reaches `failed` via stale-recovery; Storage object eventually cleaned up by the expiry/cleanup job once no matching order exists |

## Required test cases

Design-level only, not executable without the local stack (see 14-local-rebuild-and-test-results.md):

1. Two sequential requests, identical key and payload → first creates an order; second returns the
   identical (minimized) response with zero additional database writes.
2. Two simultaneous requests, identical key and payload → exactly one order is ever created, exactly
   one Storage object is ever uploaded (not merely one order — this test must assert the Storage
   side effect too).
3. Same key, second request with a different item/quantity/slip → second request rejected as
   `IDEMPOTENCY_KEY_REUSED`; first order (if any) unaffected; **stored `request_hash` and `order_id`
   are unchanged** (regression test for Problem A1).
4. Malformed idempotency key (post-mandatory-rollout) → `400`, confirmed zero rows written.
5. Retry after a genuine transient failure reaching `complete_order_for_claim` → second attempt with
   the same key and same payload processes independently via `retry_idempotency_key` and can succeed;
   `error_code` on the first row reads a mapped code, not a raw exception message.
6. Deterministic validation failure (e.g., malformed payment method, unknown product, inactive
   product, invalid quantity) → rejected at step 1/2, before any idempotency-key row is created;
   confirmed via a subsequent identical request also being rejected at the same step, not treated as
   an idempotency replay.
7. Two retries racing after a `failed` state, same payload → exactly one wins
   `retry_idempotency_key`'s compare-and-swap; the other observes a `collision` outcome, not
   `key_reused` (regression test distinguishing the two `retry_idempotency_key` failure branches).
8. **Failed-status durability**: force `complete_order_for_claim` into its exception branch and
   confirm the row is actually `failed` (not stuck `processing`) after the call returns — regression
   test for Problem A2.
9. Simulated crash after slip upload, before `complete_order_for_claim` is called → confirms the row
   remains `processing` until the stale-recovery timeout elapses, confirms a retry before the
   timeout gets `409 IDEMPOTENCY_IN_PROGRESS`, confirms a retry after the timeout (once recovered to
   `failed`) proceeds normally and reuses the existing Storage object rather than re-uploading.
10. Retry after idempotency-row expiry → confirms this is a known, accepted duplicate-order risk per
    the retention discussion above, not a bug.
11. Old frontend, no key, during rollout phase 1 → confirms the endpoint falls back to legacy
    (no-dedup) behavior rather than rejecting the request.
12. Same key, normalized-equivalent payload (e.g., whitespace-only difference that `asTrimmedString`
    would normalize identically) → confirms `request_hash` is computed over the *post-normalization*
    values, so a client-side formatting difference does not spuriously trigger
    `IDEMPOTENCY_KEY_REUSED`.
13. Same key, genuinely changed customer or slip data → confirms `request_hash` differs and the
    request is correctly rejected as `IDEMPOTENCY_KEY_REUSED`.
14. Stale-processing recovery finds a matching completed order → confirms the recovery function marks
    the row `completed` (not `failed`) and backfills `response_snapshot`, rather than allowing a retry
    to attempt a second `create_order` call for an order that already exists.
15. **New — attempt-ownership regression:** simulate a slow original attempt that is recovered by
    `recover_stale_processing_idempotency_keys` while still in flight, then let the original attempt's
    (delayed) call to `complete_order_for_claim` finally arrive → confirms it receives
    `ATTEMPT_SUPERSEDED`, and confirms it does not overwrite whatever the recovery job or a subsequent
    newer attempt already wrote.
16. **New — request-hash immutability:** attempt a direct `update ... set request_hash = ...` against
    an existing row (bypassing the application functions entirely, as `postgres`/table owner in the
    test) → confirms `idempotency_keys_hash_immutable` rejects it.
17. **New — abandoned-slip cleanup:** a row reaches `failed` via stale-recovery and is never retried;
    confirms the cleanup job deletes its Storage object once no matching `public.orders` row exists,
    and confirms it does **not** delete the object if a matching order does exist (defense against a
    cleanup bug deleting a legitimately-in-use slip).

## Migration impact

Strictly additive: one new table (`private.idempotency_keys`), five new functions
(`private.claim_idempotency_key`, `private.retry_idempotency_key`, `private.complete_order_for_claim`,
`private.recover_stale_processing_idempotency_keys`,
`private.enforce_idempotency_key_hash_immutable`), one new trigger
(`idempotency_keys_hash_immutable`), zero changes to `orders`, `products`, `settings`, `profiles`, or
`create_order`'s own existing signature/body (it would be called *from* `complete_order_for_claim`
rather than modified). The `create-order` **edge function** itself would need a new version
implementing the claim-before-upload sequence above — an edge-function redeploy, not a schema
migration, independently revertible to the current version 2 without any database rollback.

## Rollback approach

```sql
drop trigger if exists idempotency_keys_hash_immutable on private.idempotency_keys;
drop function if exists private.enforce_idempotency_key_hash_immutable;
drop function if exists private.recover_stale_processing_idempotency_keys;
drop function if exists private.complete_order_for_claim;
drop function if exists private.retry_idempotency_key;
drop function if exists private.claim_idempotency_key;
drop table if exists private.idempotency_keys;
```

No foreign keys point *into* this table from anywhere else, so dropping it has zero effect on
existing order data. The edge function can independently be rolled back to its current deployed
version regardless of whether the table/functions exist.

## Explicitly not designed here

- The stale-processing recovery job's exact scheduling mechanism (`pg_cron` vs external scheduler).
- Whether `request_hash` should also cover `honeypot` (recommend: no — unchanged from the original
  design's reasoning).
- Any change to rate limiting — addressed separately in 18-create-order-abuse-controls.md.
- The exact normalization function used for `request_hash` computation in test case 12 above — it
  should reuse whatever normalization `create-order` already performs (`asTrimmedString` etc.), not
  a new, separately-maintained normalization routine.
- The exact Storage API mechanism for detecting "object already exists" vs. other upload errors
  (depends on the Supabase Storage client's error shape at implementation time) — a detail for
  whoever builds this, not a design decision.
- Verifying `create_order`'s actual internal SQLSTATE/message conventions per validation branch — a
  required prerequisite step before implementation (see Problem D2 above), not performed in this
  docs-only correction pass.
- A distinct "amend my order" flow for a customer who needs to replace an already-uploaded slip under
  the same key (see "Storage consistency" above) — out of scope for idempotency design itself.
