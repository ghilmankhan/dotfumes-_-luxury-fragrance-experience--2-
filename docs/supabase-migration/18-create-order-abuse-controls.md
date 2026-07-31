# 18 — `create-order` Abuse Controls Design

**Design only. Not implemented, not deployed.** Addresses the second P1 finding from
11-edge-function-audit.md: `create-order` has no application-level rate limiting, and the honeypot
field is currently the only anti-abuse control on a fully anonymous, unauthenticated endpoint.

**Revision history:**

- 2026-08-01 (Foundation Closure pass) — original design; count-then-insert enforcement, race-prone.
- 2026-08-01 (Foundation Evidence Reconciliation pass) — replaced count-then-insert with a single
  atomic operation; added identifier protection, targeted-denial mitigation, database-DoS-avoidance
  reasoning, expanded body-size handling, a CORS clarification, and a CAPTCHA launch policy.
- 2026-08-01 (Foundation Artifact Preservation and Final Design Correction pass) — added explicit
  function-execute grants; added input validation inside `check_and_increment_rate_limit` itself;
  replaced the hardcoded 1-hour cleanup assumption with cleanup derived explicitly from the approved
  maximum window duration; resolved a contradiction between the per-phone-only layer's stated CAPTCHA
  escalation and the CAPTCHA launch policy's own "not enabled at initial launch"; fixed
  `retry_after_seconds` to never return a value below 1; restated the client-IP dependency as an
  explicit implementation-blocked status.
- 2026-08-01 (Foundation Correction Commit and Local-Execution Preparation pass) — this revision.
  Corrects a real key-collision risk: the previous key `(operation, dimension, dimension_value,
  window_start)` has no way to distinguish two *different policies* that happen to use the same
  dimension (e.g. a short per-IP window and a long per-IP window) — both would fall into the same
  bucket and corrupt each other's counts. Adds a `policy_id` concept and a server-controlled policy
  table so the Edge Function submits a known `policy_id` rather than caller-supplied
  `p_limit`/`p_window_seconds`, closing the configuration-drift risk of an edge function (or a bug in
  it) being able to request an arbitrarily weak limit. Also adds an explicit deployment-safe initial
  policy section stating plainly which enforcement dimensions can and cannot actually be turned on
  before trusted IP extraction and CAPTCHA exist.

**Status: Design Corrected — Not Implemented — Awaiting Approval.**

## What this is deliberately separate from

Idempotency (17-order-idempotency-design.md) prevents *the same legitimate attempt* from being
processed twice. Abuse control here prevents *many distinct illegitimate attempts*. A client
retrying its own idempotency key must never be penalized by rate limiting — idempotency-key replays
short-circuit before any rate-limit-consuming work happens, so a legitimate retry storm from a
flaky connection does not itself trip abuse thresholds.

**Exactly what qualifies for the bypass:** only a **verified, same-payload replay of an existing
`completed` idempotency key** (17-order-idempotency-design.md's `request_hash`-match branch) may
skip the rate-limit increment. Every other idempotency outcome must still consume a rate-limit slot,
since none of them is provably "the same legitimate attempt already accounted for":

- A **new** idempotency key (first attempt) — rate-limited normally; it is, by definition, a new
  attempt.
- A **malformed** key — rate-limited; a malformed key gets no idempotency benefit at all.
- A **reused key with a changed payload** (`IDEMPOTENCY_KEY_REUSED`) — rate-limited; this is exactly
  the pattern an attacker would use to probe past the bypass (claim a valid-looking key, then vary
  the payload to avoid ever hitting a real limit).
- A **random-key flood** (many distinct keys, one attacker) — rate-limited; distinct keys never
  collide with a `completed` row, so every one of them is, correctly, a new attempt from the
  limiter's point of view.
- An **invalid request** (fails lightweight validation, per 17-order-idempotency-design.md's
  claim-before-upload flow) — rate-limited; an attacker sending intentionally-invalid requests to
  probe validation behavior is still consuming server resources per attempt.
- An **expired key** (row already deleted per retention) — rate-limited; from the limiter's
  perspective this is indistinguishable from a new key, because it is one.

Only the narrow "same key, same request_hash, prior status = completed" branch bypasses the
limiter — every other branch, including a `failed`-key retry, still consumes a slot (a `failed`-key
retry is a *new* attempt at succeeding, not a replay of a completed one, so it correctly still
counts against the caller's rate limit).

## Server-controlled policy configuration (corrected this pass)

**Defect in the previous revision:** `check_and_increment_rate_limit` accepted `p_limit` and
`p_window_seconds` directly from its caller, only bounded by an allowlist/range check inside the
function. That still meant the actual threshold and window for any given call was whatever the Edge
Function's own code happened to pass in — a bug or an unreviewed code change in the Edge Function
could silently weaken a limit (e.g., an accidental `p_limit := 800` instead of `8`) without touching
the database at all, and the check inside the function would not catch it as long as it stayed
within the generic allowlisted range.

**Corrected design — Option 1 (database policy table), selected over a hardcoded function mapping:**
the exact operation, dimension, window, and limit for every enforceable check now live in a
migration-controlled table, `private.rate_limit_policies`. The Edge Function submits only a
`policy_id` (a known, small, fixed string) and the caller-specific `dimension_value` — never a
caller-supplied limit or window. This is preferred over a hardcoded `case` statement inside the
function body because policy rows are independently auditable (`select * from
private.rate_limit_policies`), reviewable in a migration diff like any other schema change, and can
be disabled (`enabled = false`) without a function redeploy — while still being just as
"not-caller-suppliable" as a hardcoded mapping, since no runtime grant allows `anon`/`authenticated`/
`service_role` to write to this table (see grants below); it is populated only by migrations.

```sql
create table private.rate_limit_policies (
  policy_id text primary key,
  operation text not null,
  dimension text not null check (dimension in ('ip_hmac', 'phone_hmac', 'ip_phone_hmac')),
  window_seconds int not null check (window_seconds between 10 and 86400),
  request_limit int not null check (request_limit > 0),
  -- 'enforce': exceeding the limit blocks the request (subject to the
  -- deployment-safe-initial-policy gating below). 'observe': exceeding the
  -- limit is logged but the request proceeds — used for the per-phone-only
  -- layer before CAPTCHA exists (see "Prevent targeted phone-number denial"
  -- below).
  mode text not null check (mode in ('enforce', 'observe')),
  enabled boolean not null default true,
  -- Whether, once CAPTCHA exists, exceeding this policy's limit should
  -- require a challenge rather than a hard reject. Ignored while CAPTCHA
  -- does not exist yet — see "CAPTCHA launch policy" below.
  challenge_after_captcha boolean not null default false,
  created_at timestamptz not null default now()
);

-- Illustrative only — exact policy_ids, thresholds, and modes are a
-- combination of business tuning decisions (thresholds — not fixed here,
-- unchanged from this document's existing position) and the
-- deployment-safe-initial-policy gating below (which of these can actually
-- run in 'enforce' mode at initial launch). NOT approved, NOT inserted by
-- any migration this design creates.
-- insert into private.rate_limit_policies
--   (policy_id, operation, dimension, window_seconds, request_limit, mode, enabled, challenge_after_captcha)
-- values
--   ('create_order_ip_short', 'create_order', 'ip_hmac', 600, 8, 'enforce', true, false),
--   ('create_order_ip_phone', 'create_order', 'ip_phone_hmac', 600, 3, 'enforce', true, false),
--   ('create_order_phone_observe', 'create_order', 'phone_hmac', 600, 15, 'observe', true, true);

revoke all on table private.rate_limit_policies from public;
revoke all on table private.rate_limit_policies from anon;
revoke all on table private.rate_limit_policies from authenticated;
-- service_role gets SELECT only — it reads policy definitions via
-- check_and_increment_rate_limit (below), it does not write them. Policy
-- rows are changed exclusively via migration, by whichever role applies
-- migrations (not a runtime-reachable role for this table).
grant select on table private.rate_limit_policies to service_role;
```

`(operation, dimension)` remain columns on the policy row (not the window row — see below) purely so
a policy's own intent is self-describing when inspected directly; they are never accepted as
free-form input from a caller.

## Atomic enforcement — one operation, policy-scoped

```sql
create table private.rate_limit_windows (
  -- Corrected this pass: the window row is now keyed by policy_id, not by
  -- the (operation, dimension) pair directly — two different policies that
  -- happen to share a dimension (e.g. a short-window and a long-window
  -- per-IP policy) can no longer collide into the same bucket, because each
  -- has its own policy_id.
  policy_id text not null references private.rate_limit_policies(policy_id),
  dimension_value text not null,     -- HMAC of the IP or normalized phone (see below — never raw)
  window_start timestamptz not null, -- floor(now(), policy's own window_seconds)
  request_count integer not null default 1,
  -- Per-row expiry, derived from the owning policy's window_seconds at
  -- insert time plus a fixed grace period — see "Cleanup and expiry" below.
  expires_at timestamptz not null,
  primary key (policy_id, dimension_value, window_start)
);

create index rate_limit_windows_expires_at_idx
  on private.rate_limit_windows (expires_at);
```

```sql
create or replace function private.check_and_increment_rate_limit(
  p_policy_id text,
  p_dimension_value text
) returns table(
  allowed boolean,
  retry_after_seconds int,
  mode text,
  challenge_after_captcha boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_policy private.rate_limit_policies;
  v_window_start timestamptz;
  v_count int;
  v_seconds_remaining numeric;
begin
  if p_policy_id is null or length(p_policy_id) = 0 or length(p_policy_id) > 64 then
    raise exception 'RATE_LIMIT_INVALID_POLICY_ID';
  end if;

  if p_dimension_value is null
     or length(p_dimension_value) = 0
     or length(p_dimension_value) > 128
     or p_dimension_value !~ '^[0-9a-f]{64}$' then
    -- 64 lowercase hex chars = the fixed output length of HMAC-SHA256 hex-encoded. Any value
    -- that isn't shaped like a real HMAC output (too short, too long, wrong charset, or a raw
    -- unhashed identifier accidentally passed through) is rejected rather than silently
    -- accepted as a new bucket key.
    raise exception 'RATE_LIMIT_INVALID_DIMENSION_VALUE';
  end if;

  -- Corrected this pass: operation/dimension/window/limit are no longer
  -- caller-supplied at all — they are looked up from the server-controlled
  -- policy table. A policy_id that does not exist, or exists but is
  -- disabled, is rejected outright. This makes an unbounded key space
  -- structurally impossible: only policy_ids that exist as enabled rows in
  -- private.rate_limit_policies (a small, finite, migration-controlled set)
  -- can ever create a rate_limit_windows bucket, regardless of what any
  -- caller passes.
  select * into v_policy
  from private.rate_limit_policies
  where policy_id = p_policy_id and enabled;

  if v_policy is null then
    raise exception 'RATE_LIMIT_UNKNOWN_OR_DISABLED_POLICY';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / v_policy.window_seconds) * v_policy.window_seconds
  );

  insert into private.rate_limit_windows
    (policy_id, dimension_value, window_start, request_count, expires_at)
  values (
    p_policy_id, p_dimension_value, v_window_start, 1,
    v_window_start + make_interval(secs => v_policy.window_seconds) + interval '1 hour'
  )
  on conflict (policy_id, dimension_value, window_start)
  do update set request_count = private.rate_limit_windows.request_count + 1
  returning request_count into v_count;

  if v_count <= v_policy.request_limit then
    return query select true, 0, v_policy.mode, v_policy.challenge_after_captcha;
  else
    v_seconds_remaining := extract(epoch from (
      v_window_start + make_interval(secs => v_policy.window_seconds) - now()
    ));
    -- Never return 0 or a negative value: at/after the window boundary (clock skew, rounding,
    -- or a request landing in the last fractional second of the window) the raw remaining-time
    -- calculation can reach zero or go slightly negative even though the caller is still, by
    -- definition, over the limit for *this* window. Round up and floor at 1 so callers never
    -- receive a `retry_after_seconds` that would tell a client to retry immediately or in the
    -- past.
    return query select
      false, greatest(1, ceil(v_seconds_remaining)::int), v_policy.mode, v_policy.challenge_after_captcha;
  end if;
end;
$$;
```

The `insert ... on conflict ... do update ... returning` remains one atomic statement — Postgres
resolves the increment-and-read race at the row level. The caller (Edge Function) is responsible for
interpreting the returned `mode`: `allowed = false, mode = 'enforce'` means actually reject the
request; `allowed = false, mode = 'observe'` means log the event (per "Failed-attempt monitoring"
below) but let the request proceed normally — this is what implements the per-phone-only layer's
before-CAPTCHA behavior (see below) without a separate code path or a separate function.

## Function privileges

```sql
revoke all on function private.check_and_increment_rate_limit(text, text) from public;
revoke all on function private.check_and_increment_rate_limit(text, text) from anon;
revoke all on function private.check_and_increment_rate_limit(text, text) from authenticated;
grant execute on function private.check_and_increment_rate_limit(text, text) to service_role;
```

`anon`, `authenticated`, `service_role`, and `public` are the standard Supabase-provisioned Postgres
roles; no project-specific role names are assumed here. **[Unverified]** whether this exact grant
pattern matches what `create_order` and the idempotency design's functions already use — should be
made consistent at implementation time, same caveat as noted in 17-order-idempotency-design.md.

### Options evaluated

| Approach | Verdict |
|---|---|
| Fixed-window counter, `insert ... on conflict ... do update` (above) | **Recommended.** Simplest correct option; one row per (policy, dimension_value, window); bounded and self-expiring in effect (old windows become irrelevant, cleaned up separately — see DoS-avoidance section). Accepts standard fixed-window edge behavior (a burst spanning a window boundary can allow up to ~2x the limit in a short span) — acceptable for this threat model, not a payment/financial-integrity control. |
| Token-bucket state | Smoother rate-limiting (no boundary-doubling effect), but requires storing and atomically updating a token count + last-refill timestamp per bucket — more state per row, more complex atomic update expression, for a benefit this endpoint's threat model doesn't need. Not recommended as the first implementation. |
| Transaction-level advisory locking | Would serialize all rate-limit checks for a given key through a lock instead of relying on the unique-index atomicity above — strictly more contention-prone for no correctness benefit. Not recommended. |
| External managed limiter (e.g., a CDN/API-gateway-level limiter) | **[Unverified] whether one is available/configurable** for a direct-to-Supabase-Edge-Function call not proxied through Vercel (see "Behavior for proxy/CDN deployment" below). Not designed further here. |
| **Policy configuration: database table (selected) vs. hardcoded function `case` mapping** | **Table selected.** Both equally prevent a caller from supplying an arbitrary limit/window. The table is preferred for auditability (`select` against a real table beats reading function source to find a `case` branch) and because disabling a single policy (`enabled = false`) does not require a function redeploy — a relevant property for the deployment-safe-initial-policy gating below, where some policies must exist in the schema but not yet run in `enforce` mode. |

## Protect sensitive identifiers — unchanged from the prior revision

```ts
// Server-only pepper, an Edge Function secret (Deno.env.get), never in any
// VITE_-prefixed variable, never in a migration file, never logged.
const dimensionValue = await hmacSha256Hex(RATE_LIMIT_PEPPER, normalizedIpOrPhone);
```

- The pepper is a single project-level secret (an Edge Function environment variable, managed the
  same way `SUPABASE_SERVICE_ROLE_KEY` already is — never in `src/`, never in a `VITE_` variable).
- HMAC (not plain SHA-256) is required specifically *because* IPs and phone numbers are low-entropy,
  guessable inputs — an unkeyed hash would let anyone with database read access (or a leaked table
  dump) trivially reverse a hash back to a real phone number or IP by hashing candidate values
  themselves. The pepper makes that infeasible without the secret.
- **Key rotation implications:** rotating the pepper invalidates every existing row's ability to be
  matched against a freshly-computed HMAC for the same real-world value — in effect, rotation resets
  all rate-limit history immediately (every subsequent request computes a new HMAC that won't match
  old rows, so old counts become orphaned and irrelevant, then age out via the existing cleanup
  process). This is a reasonable, low-risk operational property (rotation "forgives" all current
  counters, not a security hole), but should be a deliberate, rare operation, not routine — since it
  also means any in-progress abuse pattern briefly resets to zero at rotation time. No rotation
  schedule proposed.

## Prevent targeted phone-number denial

**Risk:** a hard per-phone limit, applied naively, lets an attacker who knows (or guesses) a real
customer's phone number submit enough junk requests carrying that phone number to lock the real
customer out of checkout — a denial-of-service against a specific victim, not against the system as
a whole. A flat "5 requests/10 minutes/phone, hard reject" does not defend against this.

**Corrected, now implemented directly via policy `mode` (not a separate code path):**

| Layer | Policy `mode` | Behavior | Reasoning |
|---|---|---|---|
| Per-IP limit | `enforce` | Hard reject at threshold (e.g., 8/10min — exact number is a business tuning decision, not fixed here) | Cheapest signal; catches unsophisticated bulk abuse; does not single out a victim's phone number |
| Per-IP-plus-phone limit | `enforce` | A tighter combined-key threshold (e.g., 3/10min for the *same* IP+phone pair) | Catches the actual "one attacker hammering one victim's phone from one place" pattern without penalizing the phone number itself |
| Per-phone-only limit — **before CAPTCHA exists** (initial launch, per the CAPTCHA launch policy below) | `observe` | Present, with a **higher** threshold than IP-plus-phone (e.g., 15/10min). On exceeding it: **observe and log only** (structured log entry, per "Failed-attempt monitoring" below) — **no hard reject, no challenge, request proceeds normally**, because `check_and_increment_rate_limit` returns `mode = 'observe'` and the Edge Function is required to treat that as non-blocking. | A phone number alone can legitimately see repeated attempts (a real customer retrying after a declined slip, shared-household ordering) — a hard reject here is the exact targeted-denial risk this layer exists to avoid, and there is no CAPTCHA integration yet to offer as a softer alternative. |
| Per-phone-only limit — **after CAPTCHA exists** (post the CAPTCHA escalation trigger, per the launch policy below) | `enforce` with `challenge_after_captcha = true` | On exceeding the same threshold: require a CAPTCHA challenge rather than a hard reject (the Edge Function checks `challenge_after_captcha` in the function's result and, once CAPTCHA is integrated, issues a challenge instead of rejecting outright). A successful challenge permits the request to proceed normally. A failed or missing challenge response is rejected with a `403`-class response (exact status/body a business/UX decision, not fixed here). | Once CAPTCHA exists, escalating to a challenge instead of a hard reject preserves a legitimate customer's ability to eventually get through while still slowing a script. Switching this policy row's `mode` from `observe` to `enforce` (and `challenge_after_captcha` to meaningful) is a data change (migration), not a function-code change. |
| Idempotency-aware retries | N/A | A legitimate retry (same `Idempotency-Key`) never consumes a new rate-limit slot — checked and short-circuited before any rate-limit increment | Prevents the idempotency design and this design from fighting each other; a flaky-network retry storm from one real customer must never look like abuse |

**Trade-off, stated explicitly:** this layering trades simplicity (a single hard per-phone cap) for
resistance to targeted denial. It is more code and more tuning knobs. The alternative — a flat hard
per-phone cap — is simpler to implement but leaves a real, named attack this design closes;
recommended to accept the added complexity.

## Deployment-safe initial policy — new this pass

**This design must not be described as "deployable" as a single unit.** Its enforcement dimensions
have independent readiness, and as of this document, several are explicitly not ready:

| Control | Status at initial deployment |
|---|---|
| Idempotency (17-order-idempotency-design.md) | Designed separately, **not deployed** — this design's bypass-for-verified-replay logic has no effect until idempotency itself ships |
| Per-phone-only policy | **Observation only** (`mode = 'observe'`) — never blocks a request, per the table above |
| CAPTCHA challenge | **Unavailable** — no integration exists yet; `challenge_after_captcha` is inert until it does (see CAPTCHA launch policy below) |
| Per-IP / per-IP-plus-phone enforcement | **Implementation Blocked Until Trusted Edge Function IP Source Is Verified** — see "Client-IP extraction" below. Neither can safely run in `mode = 'enforce'` until that verification happens, regardless of whether the policy table and function above are deployed. |
| Honeypot | **Already deployed, current existing control** — unaffected by anything in this document |
| Body-size and structural validation (request body section below) | **Candidate for earlier implementation** — does not depend on IP extraction, CAPTCHA, or the policy-table machinery above; could ship independently and sooner |
| Random-key / random-request flood abuse | **Remains unresolved by this document alone** — without a trustworthy per-IP dimension (blocked) and without CAPTCHA (unavailable), a distributed flood using distinct fake identifiers per request has no enforcement layer that can currently stop it; the atomic counter and policy-table machinery are necessary infrastructure for this, but not sufficient on their own while IP extraction remains blocked |

**Consequence, stated plainly:** at the moment this document reaches "approved," the schema and
function above can be safely created (they enforce nothing on their own — an empty or
all-`observe`-mode policy table is inert), but **no policy should be inserted with `mode = 'enforce'`
until the IP-extraction blocker is independently resolved**. Until then, this design's only
observable effect in production would be the per-phone-only `observe` logging and whatever
non-identifier controls (honeypot, body-size/structural validation) are already independent of it.
Do not treat "the rate limiter is implemented" as equivalent to "abuse is now actually being
blocked" — those are two different claims, and only the second one matters operationally.

## Database denial-of-service risk

The rate limiter itself must not become the thing an attacker uses to degrade the database:

- **Unbounded table growth and cleanup/expiry:** `rate_limit_windows` accumulates one row per
  (policy, dimension_value, window) combination. Bounded in practice because `window_start` buckets
  requests into fixed time slots — the table's growth rate is a function of distinct-identifier
  traffic volume, not request volume within a window (repeat requests from the same identifier in the
  same window increment an existing row, they don't insert a new one). Cleanup uses a per-row
  `expires_at` (schema above), computed at insert time as `window_start + this policy's own
  window_seconds + 1 hour grace` — since `window_seconds` now comes from the policy row rather than a
  caller argument, this is exactly as correct as before but additionally cannot drift out of sync with
  a caller passing an unexpected window duration, because no caller can pass one at all anymore:

  ```sql
  delete from private.rate_limit_windows where expires_at < now();
  ```

  This scan uses `rate_limit_windows_expires_at_idx` (schema above). **Cleanup schedule:** an
  operational choice, not fixed here (a periodic job — e.g. `pg_cron` — running on the order of every
  15-60 minutes is sufficient). **Maximum retention:** governed entirely by the owning policy's
  `window_seconds + 1 hour grace` — there is no separate, independently-configurable retention
  setting to keep in sync. **Policy removal behavior:** `rate_limit_windows.policy_id` has a foreign
  key to `rate_limit_policies.policy_id` with no `on delete` action specified, meaning a policy row
  cannot be deleted while window rows still reference it — an operator retiring a policy should first
  set `enabled = false` (stops new buckets from being created under it) and wait for its existing
  window rows to age out via the expiry cleanup above before deleting the policy row itself, rather
  than deleting the policy immediately and hitting a foreign-key error. **Effect of policy
  configuration changes on existing buckets:** changing a policy's `window_seconds` or `request_limit`
  does not retroactively alter any already-inserted `rate_limit_windows` rows (their `expires_at` was
  computed once, at insert time, from whatever the policy's values were then) — a config change only
  affects buckets created *after* the change. This is an accepted, intentional property (mid-window
  threshold changes do not retroactively reinterpret requests already counted), not a gap.
- **Expensive `count(*)` queries:** eliminated entirely by this design — there is no `count(*)`
  anywhere in the atomic function above; the count is maintained incrementally in
  `request_count`, read directly by primary key, not recomputed by scanning rows.
- **Hot-row contention:** a single wildly popular `(policy_id, dimension_value, window_start)` key
  (e.g., a very high-traffic shared IP, such as a corporate NAT gateway or mobile carrier CGNAT) could
  see many concurrent `on conflict ... do update` statements against the same row inside the same
  window, causing lock contention. This is a real, accepted trade-off of any atomic-counter approach —
  the alternative (sharding a single logical counter across multiple rows to spread contention) adds
  real complexity for a problem that, at this project's current and reasonably foreseeable traffic
  scale, does not justify it. Flagged as a scale-dependent design revisit, not solved here.
- **Attackers turning the limiter into the bottleneck:** because every `create-order` call — even
  ones that will be rejected — must still perform the atomic increment to be counted, a large-enough
  flood still generates real database write traffic. This is inherent to any server-side counter
  design (in-memory counters would avoid it but are not viable here — Edge Functions are stateless
  across invocations). Mitigation is layered: the atomic single-statement design keeps each individual
  write cheap (one indexed upsert, no scan), and the per-IP layer is deliberately the *first* check
  performed, before any more expensive validation work, so a flood is rejected as early and cheaply as
  possible in the request lifecycle — **once the per-IP layer is actually unblocked for enforcement**,
  per the deployment-safe-initial-policy section above.

## Request body — expanded beyond a `Content-Length` check

**Unchanged from the prior revision.**

| Concern | Handling |
|---|---|
| `Content-Length` present | Reject if it exceeds the fixed ceiling (e.g. 8 MB) before calling `req.json()`/`req.text()` — cheap, early rejection. |
| Missing `Content-Length` header | A client (or attacker) can omit it or send a chunked-transfer body with no upfront length. The explicit-header check alone does **not** cover this case — the runtime will still buffer/read the body regardless of whether a length was declared. |
| Chunked-transfer encoding | Deno's HTTP server (the Edge Function runtime) does not require `Content-Length` for a well-formed request; a chunked body bypasses a header-only check entirely. Must be handled by **also** enforcing a maximum on the actual bytes read (e.g., reading via a size-limited stream/reader rather than trusting the header alone), not by the header check in isolation. |
| Runtime/platform maximum | Supabase Edge Functions run on Deno Deploy's infrastructure, which has its own platform-level request-size ceiling — **[Unverified]** exact current value; must be re-checked against current Supabase/Deno documentation immediately before implementation rather than assumed from training data. The application-level 8 MB ceiling should be set comfortably below whatever that platform maximum is, not treated as the only limit. |
| Post-read encoded (base64) length vs. decoded size | The payment slip arrives as base64 inside the JSON body — base64 inflates size by ~33%. The existing `MAX_SLIP_BYTES = 5 MB` check (11-edge-function-audit.md) already applies to the **decoded** bytes; this design's new 8 MB *request-body* ceiling must stay clearly larger than the base64-inflated size of a 5 MB slip (~6.7 MB) plus JSON overhead, which it is. |
| JSON structure limits | Beyond raw byte size, an attacker could send a small-in-bytes but pathologically nested or wide JSON structure intended to cause expensive parsing/validation rather than exhausting bandwidth. The existing validation (`MAX_ITEMS = 50`, `MAX_QTY_PER_ITEM = 20`, `asTrimmedString` length caps — 11-edge-function-audit.md) already bounds the *fields this endpoint actually reads*; recommend explicitly confirming (not verified this pass — an implementation-time check) that `req.json()`'s own parse step has no separate pathological-nesting risk independent of those field-level caps. |
| Maximum item count | Already enforced (`MAX_ITEMS = 50`) — unchanged, cited here for completeness. |
| Maximum string lengths | Already enforced per-field via `asTrimmedString`'s caps — unchanged, cited for completeness. |

## CORS — clarified

**Unchanged from the prior revision.** **CORS is not authentication and does not stop non-browser
clients.** A wide-open `Access-Control-Allow-Origin: "*"` (as currently deployed) only affects
whether a *browser* enforces same-origin restrictions on JavaScript reading the response — it has
zero effect on `curl`, a script, or any non-browser HTTP client, all of which can call `create-order`
directly regardless of any `Origin` header they choose to send or omit. Since `create-order` has
`verify_jwt: false` and no cookie/session-based auth (11-edge-function-audit.md), there is no ambient
credential for a CSRF-style attack to ride along with in the first place. **Recommendation: keep CORS
wide-open as currently deployed; do not treat restricting it as a rate-limiting or abuse control** —
that job belongs entirely to the atomic limiter above.

## CAPTCHA launch policy

**Unchanged from the prior revision.**

| Environment | Policy |
|---|---|
| Development | No CAPTCHA. Rate limiting alone (this design) is exercised during development/testing. |
| Preview/staging | No CAPTCHA by default, but the integration (if built) should be *testable* here first. |
| Production launch | **Not enabled at initial launch.** Ship with the atomic rate limiter (this design) and the layered per-phone/per-IP controls above as the initial control set — subject to the deployment-safe-initial-policy gating above, i.e. the per-IP layers remain additionally blocked on IP-source verification regardless of CAPTCHA status. |
| Escalation policy | CAPTCHA/Turnstile becomes a **committed follow-up**, not a maybe, once **either** of these is observed post-launch: (a) the per-IP or per-phone-only layers are being hit at a sustained rate suggesting the atomic limiter alone is insufficient, or (b) a targeted-denial pattern (per "Prevent targeted phone-number denial" above) is actually observed in logs, not just theoretically possible. Whoever operates the project post-launch owns watching for this trigger — not designed as an automated alert here. Once built, activating it for the per-phone-only policy is a data change (`mode: observe → enforce`, `challenge_after_captcha: true`), not a function-code change. |

## Failed-attempt monitoring — unchanged from original design

Log (not to the client-facing response) a structured event on every rate-limit rejection (both
`mode = 'enforce'` denials and `mode = 'observe'` over-threshold events) and every validation
failure, keyed by the same HMAC'd dimensions as the limiter — `console.error`/`console.log` already
flow to Supabase Edge Function logs (`get_logs service=edge-function`, per
11-edge-function-audit.md). No new logging infrastructure needed, just consistent structured fields.
This is also the input the CAPTCHA escalation policy above depends on.

## Temporary blocking — unchanged from original design

The rate limiter's own enforcement action **is** the temporary block — a time-windowed counter that
resets naturally achieves "temporary" blocking without a persistent ban list to maintain, expire, or
appeal.

## Honeypot retention — unchanged from original design

Keep as-is. Silent-accept-and-drop behavior is correct and should not be touched — visibly rejecting
honeypot-triggered submissions would teach bots to detect and route around it.

## Duplicate-request detection — unchanged from original design

Handled entirely by 17-order-idempotency-design.md, not duplicated here.

## Behavior for proxy/CDN deployment — unchanged from original design

`create-order` is called directly from the browser to
`https://jguewximloxmbhpsoxjb.supabase.co/functions/v1/create-order` — confirmed via the function's
own CORS configuration and the absence of any Vercel rewrite/proxy config found in this repository
(13-environment-classification.md — no `vercel.json` found). There is currently no CDN or reverse
proxy of this project's own between the browser and Supabase's edge network.

## Client-IP extraction

**Status: Implementation Blocked Until Trusted Edge Function IP Source Is Verified.**

Unchanged risk from the prior revision: the exact trustworthy header for a client's real IP inside a
custom Edge Function was not fully re-confirmed this pass. `search_docs` documents
`Sb-Forwarded-For` specifically for **Supabase Auth's own** rate limiting, requiring a secret API
key — not directly confirmed applicable to a custom Edge Function's own request handling. **Do not
trust a client-supplied `X-Forwarded-For` naively** — an unauthenticated caller can set that header
to any value it wants, and treating it as the real client IP without a verified trust boundary would
let an attacker forge a victim's IP (defeating the per-IP limit entirely) or continuously rotate a
fake IP value (defeating it just as effectively as having no per-IP limit at all). **The per-IP and
per-IP-plus-phone layers above must not be approved for `mode = 'enforce'` until this header source
is independently verified against current Supabase/Deno Edge Function documentation** — this design
does not approve IP-based enforcement based on an unverified/untrusted header. Recommend implementing
IP extraction as a single small helper function, isolated specifically so it can be corrected in one
place once the exact current header semantics are re-verified. The per-phone-only (`observe` mode)
and idempotency-aware-retry layers do not depend on IP extraction and are not blocked by this.

## What is explicitly not designed here

- Exact numeric thresholds (requests per window, per policy) — a product/business tuning decision,
  not a schema or architecture one. The illustrative `insert` statement above is commented out and
  not approved.
- Turnstile/CAPTCHA integration implementation details (widget wiring, siteverify call) — the launch
  *policy* above is unchanged; the integration itself remains a future follow-up per that policy.
- Any change to `create_order`'s own RPC body or to `products`/`orders`/`settings` — this control
  lives entirely in the Edge Function layer plus two new `private`-schema tables and one new
  function, identical in spirit and schema location to the idempotency design's footprint.
- The rate-limit cleanup job's exact scheduling mechanism — an operational choice, not a schema one.
- The pepper's storage/generation mechanism beyond "an Edge Function secret" — provisioning details
  are an implementation task, not a design decision.
- A migration or process for adding/editing policy rows beyond "a normal schema migration" — no
  admin UI or runtime policy-editing endpoint is designed here.
