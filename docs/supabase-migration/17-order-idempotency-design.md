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
- 2026-08-01 (Foundation Artifact Preservation and Final Design Correction pass) — this revision.
  Corrects a real transaction-rollback contradiction in the previous `claim_and_create_order`
  function (Problem A below: the exception handler's own `update ... status = 'failed'` was undone
  by its own `raise;`), splits the previous single combined function into a two-phase
  claim/complete design to correctly sequence the Storage slip upload between them (Problem B), adds
  a `unique (operation, order_id)` constraint (Problem C), adds stale-`processing` recovery via
  `processing_started_at` (Problem D — the earlier revision incorrectly implied a single transaction
  design eliminates all `processing`-timeout concerns; it does not, once Storage upload is correctly
  sequenced between claim and completion), and adds explicit function-privilege grants (Problem E).
  The core mechanism (atomic claim via `on conflict ... do nothing`) is preserved.

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

**Correction:** the schema above adds `unique (operation, order_id)`. Reasoning: `order_id` is
generated fresh (`crypto.randomUUID()`) exactly once per *new* claim (a retry of an existing key
reuses the already-stored `order_id` via `update`, never a new `insert`), so under correct
application logic one order UUID should never appear in more than one idempotency-key row. A
database-level unique constraint turns "the application never does this" into "the application
cannot do this even if a future bug tries to" — a second claim attempt that accidentally reused an
`order_id` (e.g., a coding error that generated the UUID outside the per-request scope) fails loudly
at the constraint instead of silently creating two idempotency rows that both claim to own the same
order, which would make "which key does this order actually belong to" ambiguous for support
lookups and reconciliation. One order is never legitimately connected to multiple idempotency keys
in this design; the constraint enforces that as an invariant rather than a convention.

## Claim-before-upload flow (Problem B)

**Correction:** the previous design (both the original and the first revision) uploaded the payment
slip to Storage *before* claiming the idempotency key, or combined the claim and `create_order` into
one function without addressing where the Storage call fits. Both are wrong: uploading before the
claim means two concurrent duplicate requests can both successfully upload a Storage object before
either one reaches the dedup check — duplicate Storage side effects are unprevented even if the
resulting *order* is correctly deduplicated afterward.

**Selected design: Option 1 (claim before upload) combined with Option 2 (deterministic slip path).**

```text
1. Validate lightweight request (structural only: required fields present, types correct,
   payment method recognized, item list non-empty — no database access, no Storage access).
2. Claim the idempotency key — private.claim_idempotency_key(...) (new, standalone function,
   see below). This is a single atomic insert; it does not touch Storage or call create_order.
   - If this returns "claimed" (first attempt, or a CAS-won retry of a failed key): continue to
     step 3.
   - If this returns "collision": branch on the existing row's status without raising an
     exception (see Concurrency behavior below) — no Storage or order-creation work happens on
     this path at all.
3. Compute the deterministic slip path from the already-claimed order_id:
   payment-slips/{order_id}/original.{validated_extension}
4. Upload the slip to that deterministic path with upsert:false (non-overwriting).
   - Normal case (first attempt for this key): upload succeeds.
   - Retry case (same key, same claimed order_id, prior upload already happened): the object
     already exists at that exact path — Storage returns an "already exists" error. Because the
     path is derived 1:1 from this key's own order_id (guaranteed unique by the Problem C
     constraint), an "already exists" result on *this specific path* can only mean *this same
     idempotency key's own prior attempt* put it there — it is treated as success (reuse the
     existing object), not as an error.
5. Call private.complete_order_for_claim(...) (new, standalone function, see below) — wraps
   create_order and the completion/failure update in one transaction.
6. Return the structured result from step 5 as the HTTP response (see Problem A below).
```

**Recovery when upload succeeds but order creation fails (step 4 succeeds, step 5 fails):** the
claim row is marked `failed` by `complete_order_for_claim`'s own exception handling (Problem A). The
slip object at the deterministic path is *not* deleted — a subsequent retry (CAS `failed` →
`processing`, same key, same `order_id`) recomputes the identical deterministic path, finds the
object already there, and treats that as step-4 success without re-uploading, then proceeds directly
to step 5 again. No orphan accumulates across retries of the *same* key, because every retry
converges on the same path. An orphan can still occur if the client abandons the flow entirely after
step 4 without ever retrying (a genuine new gap this design does not fully close — see the failure
table below) — this is materially narrower than the previously-documented "orphan on every
slip-upload-then-crash" gap (11-edge-function-audit.md P2), because it can now only happen once per
key rather than once per retry.

**Why claiming before uploading is necessary and sufficient:** the claim insert is the only
operation in this entire flow protected by a database unique index (`operation, key`), so it is the
only point that can correctly serialize concurrent duplicate requests. Performing it first means no
duplicate request can reach the Storage call at all — the second of two concurrent identical
requests receives its collision result at step 2, before any Storage or order-creation side effect
has been attempted.

## Problem A — corrected failed-status handling (no raise-after-update)

**Defect in the previous revision:** the previous `claim_and_create_order` function's exception
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
commit ahead of their enclosing transaction. So the previous design's own "mark it failed" write was
undone by its own `raise;`, leaving the row silently stuck in `processing` forever on every genuine
failure — worse than not having the exception handler at all, because it gave the false impression
that failures were being recorded.

**Corrected design:** `complete_order_for_claim` never re-raises. It catches the error, writes the
`failed` status itself, and **returns** a structured failure result — allowing the function to
complete normally, so the enclosing transaction commits (including the `failed` write) rather than
aborting.

```sql
create or replace function private.complete_order_for_claim(
  p_operation text,
  p_key uuid,
  p_order_id uuid,
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
begin
  begin
    v_result := public.create_order(
      p_order_id, p_customer, p_items, p_payment_method, p_slip_path, p_whatsapp_message
    );

    update private.idempotency_keys
    set status = 'completed', response_snapshot = v_result, completed_at = now()
    where operation = p_operation and key = p_key;

    return jsonb_build_object('success', true, 'result', v_result);
  exception
    when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate;

      -- Map known, deterministic-cause SQLSTATEs to a stable, client-safe error code and a
      -- retryability flag. The raw exception message (which may contain internal details such
      -- as constraint names or column values) is never stored or returned — only the mapped
      -- code. Unknown/unexpected SQLSTATEs fall through to a generic, non-retryable code so a
      -- genuinely unanticipated server error does not get silently retried in a loop.
      case v_sqlstate
        when '23505' then v_error_code := 'DUPLICATE'; v_retryable := false;        -- unique_violation
        when 'P0001' then v_error_code := 'OUT_OF_STOCK'; v_retryable := true;       -- raised by create_order
        else v_error_code := 'ORDER_CREATION_FAILED'; v_retryable := false;
      end case;

      update private.idempotency_keys
      set status = 'failed', error_code = v_error_code
      where operation = p_operation and key = p_key;

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
`success: false, error_code: 'OUT_OF_STOCK', retryable: true` → `409` with a retry-permitted body;
`error_code: 'ORDER_CREATION_FAILED', retryable: false` → `500` with a generic message). The raw
Postgres error text is available only in the database's own server-side logs (via Postgres's normal
error logging, not via anything this function returns or stores), never in `error_code` or in any
client-facing response.

**Deterministic validation failures — replayable-as-failed, not silently retryable, and ideally
never reach this function at all:** two different kinds of failure need to be told apart:

- **Transient, state-dependent failures** (e.g., `OUT_OF_STOCK` — depends on concurrent stock
  levels that can change between attempts) are correctly modeled as `status = 'failed'` +
  `retryable = true`: a later retry with the same key may legitimately succeed once stock changes,
  and the atomic CAS `failed → processing` transition (unchanged from the prior revision, still
  applies here — see below) lets that retry proceed safely.
- **Deterministic validation failures** (malformed payload shape, unrecognized payment method,
  empty item list) do not depend on any state that could change between attempts — retrying with an
  identical payload will always fail identically. These should be rejected by the **lightweight
  validation in step 1 of the claim-before-upload flow above, before the idempotency key is ever
  claimed at all** — so they never consume an idempotency-key row or reach
  `complete_order_for_claim` in the first place. If such a failure were nonetheless caught here
  (e.g., a validation gap), it is still correctly recorded as `status = 'failed',
  retryable = false` — a client "retrying" an unfixable request should not be encouraged to keep
  hammering the same key, but the key itself is still safely replayable (it will just deterministically
  return the same rejection) rather than left in an ambiguous state.

## Atomic retry acquisition — compare-and-swap, unchanged from the prior revision

The `failed → processing` transition remains an atomic compare-and-swap, now also resetting
`processing_started_at` (needed for Problem D's staleness check to measure *this* attempt's age, not
a prior one):

```sql
update private.idempotency_keys
set status = 'processing',
    request_hash = $2,
    request_id = $3,
    processing_started_at = now(),
    completed_at = null,
    error_code = null
where operation = $1
  and key = $4
  and status = 'failed'
returning *;
```

Presence of a returned row is the only signal used to decide "did I win the claim" — never a
separate `select` followed by a separate `update`, which would reintroduce a check-then-act race.

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

The caller (edge function) distinguishes "I won the claim" from "collision" by comparing the
returned row's `processing_started_at`/`request_id` against what it just sent, or more simply by
checking whether the returned row's `status` is `processing` **and** its `request_id` matches the
request that just called this function — a genuine fresh claim always has `status = 'processing'`
immediately after this call, so the deciding signal is whether this call itself performed the insert
(it can track that by checking `xmax = 0` on the returned row via a second output column if an exact
signal is required; documented here as an implementation detail, not a design gap, since either
approach reliably distinguishes "I just created this row" from "a row already existed").

## Problem D — processing timeout and stale-recovery

**Correction to the prior revision's claim:** the prior revision stated that a single-transaction
design "proves that persistent `processing` rows cannot occur" and removed recovery-state handling
on that basis. That claim no longer holds under the corrected claim-before-upload flow: the claim
(`private.claim_idempotency_key`) and the completion (`private.complete_order_for_claim`) are now
**two separate transactions**, with a Storage API call (not SQL, cannot be wrapped in a Postgres
transaction) in between. A row can therefore legitimately sit in `processing` for the duration of
the Storage upload — and, if the edge function process is killed, crashes, or the platform times it
out mid-upload (before calling `complete_order_for_claim` at all), the row stays `processing`
indefinitely with no natural mechanism to ever change it. Recovery handling is required.

- **`processing_started_at`**: already added to the schema above; reset on every claim/retry.
- **Stale-processing timeout**: recommended **2 minutes** — comfortably longer than any expected
  Storage upload for a payment-slip-sized image, short enough that a genuinely stuck request has
  long since returned a client-side timeout error to the customer. **Not approved** — a
  recommendation, not a business decision already made, consistent with this document's treatment
  of the retention period below.
- **Recovery ownership**: no multi-worker lease token is needed for the recovery step itself,
  because the recovery operation (below) is a single atomic `update ... where ... returning`
  statement — the same "presence of a returned row decides the winner" pattern used for claim
  acquisition. Two concurrent recovery scans (e.g., two overlapping cron runs) cannot both
  "recover" the same stale row for the same reason two concurrent retries cannot both win the
  `failed → processing` CAS.
- **Atomic recovery operation**:

```sql
update private.idempotency_keys
set status = 'failed', error_code = 'STALE_PROCESSING_RECOVERED'
where status = 'processing'
  and processing_started_at < now() - interval '2 minutes'
returning operation, key, order_id;
```

  A recovered row becomes a normal `failed` row — a later retry of the same key proceeds through
  the ordinary atomic CAS path described above. Before marking a row `STALE_PROCESSING_RECOVERED`,
  the recovery job should additionally check `public.orders` for a row matching the claimed
  `order_id`: if one exists (the create_order call actually succeeded, but the process died before
  `complete_order_for_claim` could write the `completed` update — a narrower variant of the same
  crash class), the recovery job should instead mark the row `completed` and backfill
  `response_snapshot` from the found order, not `failed` (marking a row `failed` when its order in
  fact exists would let a client retry and attempt to create a *second* order for what is really an
  already-fulfilled attempt).
- **Supporting index**: `idempotency_keys_processing_started_at_idx`, added to the schema above.
- **Scheduling mechanism** (e.g., `pg_cron` vs. an external scheduler invoking this as a periodic
  RPC) is left unspecified here — an implementation detail, not a design decision, consistent with
  how the original design already treated the (now-superseded) reconciliation-job alternative.

## Problem E — function privileges

**Correction:** the prior revision did not specify explicit grants for any of this design's
functions. Every privileged function introduced by this design must be locked down to the service
role that the `create-order` edge function actually authenticates as. **[Unverified]** whether
`create_order`'s own existing grants already follow this exact pattern — not re-inspected in this
pass; the grants below should be made consistent with whatever `create_order` currently has, and any
discrepancy found at implementation time should be resolved in favor of the more restrictive of the
two rather than assumed away. `anon`, `authenticated`, `service_role`, and `public` are the standard
Supabase-provisioned Postgres roles; no project-specific role names are assumed here.

```sql
revoke all on function private.claim_idempotency_key(text, uuid, text, text, uuid) from public;
revoke all on function private.claim_idempotency_key(text, uuid, text, text, uuid) from anon;
revoke all on function private.claim_idempotency_key(text, uuid, text, text, uuid) from authenticated;
grant execute on function private.claim_idempotency_key(text, uuid, text, text, uuid) to service_role;

revoke all on function private.complete_order_for_claim(text, uuid, uuid, jsonb, jsonb, text, text, text) from public;
revoke all on function private.complete_order_for_claim(text, uuid, uuid, jsonb, jsonb, text, text, text) from anon;
revoke all on function private.complete_order_for_claim(text, uuid, uuid, jsonb, jsonb, text, text, text) from authenticated;
grant execute on function private.complete_order_for_claim(text, uuid, uuid, jsonb, jsonb, text, text, text) to service_role;
```

Both functions are `security definer` (required, same reasoning as `private.handle_new_user()` in
the profiles migration — the edge function's `service_role` connection already bypasses RLS, but
`security definer` here additionally means these functions do not depend on the caller separately
holding table-level grants on `private.idempotency_keys` or `public.orders`; the explicit `revoke`/
`grant` pair above is what actually restricts *who may call the function at all*, independent of
`security definer`/`invoker`). `set search_path = ''` is carried over unchanged from the existing
`private.handle_new_user()` / `private.sync_user_email()` pattern in this codebase, for the same
search-path-injection-hardening reason.

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

## Response storage — minimized

`response_snapshot` stores only what a legitimate replay needs to reproduce the original HTTP
response body: `orderId` (code), `orderUuid`, `createdAt`, `subtotal`, `deliveryFee`, `total`,
`currency`, `items` — i.e., exactly the fields `create-order` already returns to the client today
(11-edge-function-audit.md, "Returned order fields" row). Do **not** persist: signed Storage URLs or
any temporary Storage credentials; the customer's full input payload beyond what the response
already legitimately includes; anything resembling a secret.

## Concurrency behavior

The claim insert (`on conflict (operation, key) do nothing returning *`, inside
`private.claim_idempotency_key`) is the sole concurrency control for the "has anyone already started
this attempt" question — Postgres resolves the race atomically at the unique-index level, the same
class of guarantee `create_order` already relies on for its `select ... for update` stock locks. No
advisory locks, no application-level mutex. Because the claim is now a standalone call (Problem B),
the caller must branch on its result *before* touching Storage:

- Returned row has `status = 'processing'` and this call performed the insert (fresh claim) →
  proceed to slip upload.
- Returned row has `status = 'processing'` and this call did **not** perform the insert (someone
  else's attempt is in flight) → `409 IDEMPOTENCY_IN_PROGRESS`, no Storage or order-creation work.
- Returned row has `status = 'completed'` → compare `request_hash`; if it matches, replay
  `response_snapshot`; if not, `409 IDEMPOTENCY_KEY_REUSED`.
- Returned row has `status = 'failed'` → attempt the CAS `failed → processing` retry described
  above; if it wins, proceed to slip upload (reusing the deterministic path, per Problem B); if it
  loses (someone else's retry won first), `409 IDEMPOTENCY_IN_PROGRESS`.

## Failure-behavior summary

| Scenario | Response | DB effect |
|---|---|---|
| First attempt, succeeds | Normal success body | One order, one stock decrement, key row `completed` |
| First attempt, deterministic validation failure (step 1, pre-claim) | Normal error body | No idempotency row ever created |
| First attempt, transient failure (e.g. out-of-stock, inside `complete_order_for_claim`) | Error body, `retryable: true` | No order, key row `failed`, `error_code = 'OUT_OF_STOCK'` |
| Retry, same key, same payload, prior = `completed` | Replayed original (minimized) success body | None — no new writes |
| Retry, same key, same payload, prior = `failed` | Reprocessed via atomic CAS `failed → processing` | Same as a fresh first attempt; concurrent retries cannot both win |
| Retry, same key, different payload | `409 IDEMPOTENCY_KEY_REUSED` | None |
| Concurrent duplicate, prior = `processing` | `409 IDEMPOTENCY_IN_PROGRESS` | None |
| Malformed/missing key, during rollout phase 1 | Falls back to legacy (no-dedup) behavior | Same as today's deployed behavior |
| Malformed/missing key, after key made mandatory | `400` | None |
| Crash/timeout during Storage upload, before `complete_order_for_claim` is called | Customer sees a client-side failure/timeout | Row stuck `processing` until stale-recovery (Problem D) reclassifies it as `failed` (or `completed`, if `public.orders` shows it actually succeeded) |
| Edge function crash after `complete_order_for_claim` returns, before HTTP response reaches client | N/A — client sees no response, but a retry with the same key correctly replays | Order + `completed` row — commit and completion are atomic within that function |
| Retry after Storage object already exists at the deterministic path | Treated as a successful re-upload, no new Storage write | Unchanged — same object reused |

## Required test cases

Design-level only, not executable without the local stack (see 14-local-rebuild-and-test-results.md):

1. Two sequential requests, identical key and payload → first creates an order; second returns the
   identical (minimized) response with zero additional database writes.
2. Two simultaneous requests, identical key and payload → exactly one order is ever created, exactly
   one Storage object is ever uploaded (not merely one order — this test must assert the Storage
   side effect too, since that is the specific gap this revision closes).
3. Same key, second request with a different item/quantity/slip → second request rejected, first
   order (if any) unaffected.
4. Malformed idempotency key (post-mandatory-rollout) → `400`, confirmed zero rows written.
5. Retry after a genuine transient failure (simulated out-of-stock) → second attempt with the same
   key processes independently and can succeed; `error_code` on the first row reads
   `'OUT_OF_STOCK'`, not a raw exception message.
6. Deterministic validation failure (e.g., malformed payment method) → rejected at step 1, before
   any idempotency-key row is created; confirmed via a subsequent identical request also being
   rejected at step 1, not treated as an idempotency replay.
7. Two retries racing after a `failed` state → exactly one wins the compare-and-swap
   `failed → processing` transition; the other observes zero rows returned and falls back to the
   `processing`-collision (`409 IDEMPOTENCY_IN_PROGRESS`) branch.
8. **Failed-status durability**: force `complete_order_for_claim` into its exception branch and
   confirm the row is actually `failed` (not stuck `processing`) after the call returns — this is
   the regression test for Problem A; the previous design would have failed this test.
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
14. Stale-processing recovery finds a matching completed order → confirms the recovery job marks the
    row `completed` (not `failed`) and backfills `response_snapshot`, rather than allowing a retry to
    attempt a second `create_order` call for an order that already exists.

## Migration impact

Strictly additive: one new table (`private.idempotency_keys`), two new functions
(`private.claim_idempotency_key`, `private.complete_order_for_claim`), zero changes to `orders`,
`products`, `settings`, `profiles`, or `create_order`'s own existing signature/body (it would be
called *from* `complete_order_for_claim` rather than modified). The `create-order` **edge function**
itself would need a new version implementing the claim-before-upload sequence above — an
edge-function redeploy, not a schema migration, independently revertible to the current version 2
without any database rollback.

## Rollback approach

`drop function if exists private.claim_idempotency_key; drop function if exists
private.complete_order_for_claim; drop table if exists private.idempotency_keys;` — no foreign keys
point *into* this table from anywhere else, so dropping it has zero effect on existing order data.
The edge function can independently be rolled back to its current deployed version regardless of
whether the table/functions exist.

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
