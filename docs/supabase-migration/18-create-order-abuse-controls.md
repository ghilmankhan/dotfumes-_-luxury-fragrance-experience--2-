# 18 — `create-order` Abuse Controls Design

**Design only. Not implemented, not deployed.** Addresses the second P1 finding from
11-edge-function-audit.md: `create-order` has no application-level rate limiting, and the honeypot
field is currently the only anti-abuse control on a fully anonymous, unauthenticated endpoint.

**Revision history:**

- 2026-08-01 (Foundation Closure pass) — original design; count-then-insert enforcement, race-prone.
- 2026-08-01 (Foundation Evidence Reconciliation pass) — replaced count-then-insert with a single
  atomic operation; added identifier protection, targeted-denial mitigation, database-DoS-avoidance
  reasoning, expanded body-size handling, a CORS clarification, and a CAPTCHA launch policy.
- 2026-08-01 (Foundation Artifact Preservation and Final Design Correction pass) — this revision.
  Adds explicit function-execute grants; adds input validation inside
  `check_and_increment_rate_limit` itself (the atomic function previously trusted its own
  arguments completely, meaning any future caller — or a bug in this caller — could create an
  unbounded key space of `(operation, dimension)` pairs); replaces the hardcoded 1-hour cleanup
  assumption with cleanup derived explicitly from the approved maximum window duration; resolves a
  real contradiction between the per-phone-only layer's stated CAPTCHA escalation and the CAPTCHA
  launch policy's own "not enabled at initial launch" — the per-phone-only layer cannot describe
  CAPTCHA escalation as active behavior before that integration exists; fixes `retry_after_seconds`
  to never return a value below 1; and restates the client-IP dependency as an explicit
  implementation-blocked status.

**Status: Design Corrected — Not Implemented — Awaiting Approval.**

## What this is deliberately separate from

Idempotency (17-order-idempotency-design.md) prevents *the same legitimate attempt* from being
processed twice. Abuse control here prevents *many distinct illegitimate attempts*. A client
retrying its own idempotency key must never be penalized by rate limiting — idempotency-key replays
short-circuit before any rate-limit-consuming work happens, so a legitimate retry storm from a
flaky connection does not itself trip abuse thresholds.

**Correction (this pass) — exactly what qualifies for the bypass:** only a **verified, same-payload
replay of an existing `completed` idempotency key** (17-order-idempotency-design.md's
`request_hash`-match branch) may skip the rate-limit increment. Every other idempotency outcome must
still consume a rate-limit slot, since none of them is provably "the same legitimate attempt already
accounted for":

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

## Atomic enforcement — corrected: one operation, not count-then-insert

**Correction:** the original design counted matching rows with a `select count(...)`, then
separately decided whether to `insert`. Two concurrent requests from the same IP/phone racing
through that check-then-act sequence can both read a count below the threshold before either has
inserted its own row — a classic TOCTOU race that lets a burst through right at the threshold,
exactly the failure mode this control exists to prevent.

Revised to a single atomic fixed-window counter, using `insert ... on conflict ... do update`:

```sql
create table private.rate_limit_windows (
  dimension text not null,           -- 'ip_hmac', 'phone_hmac', or 'ip_phone_hmac'
  dimension_value text not null,     -- HMAC of the IP or normalized phone (see below — never raw)
  operation text not null,           -- 'create_order'
  window_start timestamptz not null, -- floor(now(), window_size) — see below
  request_count integer not null default 1,
  -- Correction (this pass): explicit, per-row expiry instead of a hardcoded cleanup assumption.
  -- Stored at insert time as window_start + this call's own window_seconds + a fixed grace
  -- period (1 hour), so cleanup never has to guess or hardcode a duration that could silently
  -- drift out of sync with whatever window durations are actually in use — see "Cleanup and
  -- expiry" below.
  expires_at timestamptz not null,
  primary key (operation, dimension, dimension_value, window_start)
);

-- Supports the cleanup scan described below; a narrow, single-purpose partial index stays cheap
-- even as the table grows, since it only ever covers rows past their own expiry.
create index rate_limit_windows_expires_at_idx
  on private.rate_limit_windows (expires_at);
```

```sql
-- Approved bounds, enforced inside the function below (Correction: the prior revision trusted
-- every argument unconditionally, which would let any caller — or a bug in the one intended
-- caller — create an unbounded key space of (operation, dimension) buckets, defeating the
-- DoS-avoidance reasoning documented further below).
-- MIN_WINDOW_SECONDS / MAX_WINDOW_SECONDS bound how coarse or fine a window any caller may
-- request; exact values are a tuning decision, illustrative here (10s .. 1 day).
create or replace function private.check_and_increment_rate_limit(
  p_operation text,
  p_dimension text,
  p_dimension_value text,
  p_window_seconds int,
  p_limit int
) returns table(allowed boolean, retry_after_seconds int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count int;
  v_seconds_remaining numeric;
begin
  if p_operation is null or p_operation not in ('create_order') then
    raise exception 'RATE_LIMIT_UNSUPPORTED_OPERATION';
  end if;

  if p_dimension is null or p_dimension not in ('ip_hmac', 'phone_hmac', 'ip_phone_hmac') then
    raise exception 'RATE_LIMIT_UNSUPPORTED_DIMENSION';
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

  if p_limit is null or p_limit <= 0 then
    raise exception 'RATE_LIMIT_INVALID_LIMIT';
  end if;

  if p_window_seconds is null or p_window_seconds < 10 or p_window_seconds > 86400 then
    -- Bounds are illustrative (10s minimum, 1 day maximum) — the exact approved minimum/maximum
    -- is a tuning decision, not fixed here; the point enforced is that *some* bound exists so a
    -- caller cannot request an effectively-unbounded or effectively-zero window.
    raise exception 'RATE_LIMIT_INVALID_WINDOW';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limit_windows
    (operation, dimension, dimension_value, window_start, request_count, expires_at)
  values (
    p_operation, p_dimension, p_dimension_value, v_window_start, 1,
    v_window_start + make_interval(secs => p_window_seconds) + interval '1 hour'
  )
  on conflict (operation, dimension, dimension_value, window_start)
  do update set request_count = private.rate_limit_windows.request_count + 1
  returning request_count into v_count;

  if v_count <= p_limit then
    return query select true, 0;
  else
    v_seconds_remaining := extract(epoch from (
      v_window_start + make_interval(secs => p_window_seconds) - now()
    ));
    -- Never return 0 or a negative value: at/after the window boundary (clock skew, rounding,
    -- or a request landing in the last fractional second of the window) the raw remaining-time
    -- calculation can reach zero or go slightly negative even though the caller is still, by
    -- definition, over the limit for *this* window. Round up and floor at 1 so callers never
    -- receive a `retry_after_seconds` that would tell a client to retry immediately or in the
    -- past.
    return query select false, greatest(1, ceil(v_seconds_remaining)::int);
  end if;
end;
$$;
```

The `insert ... on conflict ... do update ... returning` is one atomic statement — Postgres
resolves the increment-and-read race at the row level, the same class of guarantee already used
throughout this project (`create_order`'s `for update` locks, the idempotency design's claim
insert). This single function call atomically: (1) validates its own arguments against an approved
allowlist/range rather than trusting the caller (Correction, this pass), (2) identifies the bucket
(`operation`, `dimension`, `dimension_value`, `window_start`), (3) increments it, (4) compares
against the limit, (5) returns allow/deny, (6) returns retry timing with a floor of 1 second.

## Function privileges

**Correction:** the prior revision did not specify explicit grants for
`private.check_and_increment_rate_limit`. Only the server role the `create-order` edge function
authenticates as should be able to call it — an unrestricted grant would let any authenticated (or,
worse, anonymous) database client consume rate-limit buckets directly, bypassing the edge function
entirely.

```sql
revoke all on function private.check_and_increment_rate_limit(text, text, text, int, int) from public;
revoke all on function private.check_and_increment_rate_limit(text, text, text, int, int) from anon;
revoke all on function private.check_and_increment_rate_limit(text, text, text, int, int) from authenticated;
grant execute on function private.check_and_increment_rate_limit(text, text, text, int, int) to service_role;
```

`anon`, `authenticated`, `service_role`, and `public` are the standard Supabase-provisioned Postgres
roles; no project-specific role names are assumed here. **[Unverified]** whether this exact grant
pattern matches what `create_order` and the idempotency design's functions already use — should be
made consistent at implementation time, same caveat as noted in 17-order-idempotency-design.md.

### Options evaluated

| Approach | Verdict |
|---|---|
| Fixed-window counter, `insert ... on conflict ... do update` (above) | **Recommended.** Simplest correct option; one row per (dimension, window); bounded and self-expiring in effect (old windows become irrelevant, cleaned up separately — see DoS-avoidance section). Accepts standard fixed-window edge behavior (a burst spanning a window boundary can allow up to ~2x the limit in a short span) — acceptable for this threat model, not a payment/financial-integrity control. |
| Token-bucket state | Smoother rate-limiting (no boundary-doubling effect), but requires storing and atomically updating a token count + last-refill timestamp per bucket — more state per row, more complex atomic update expression (needs to compute elapsed-time-based refill inline), for a benefit (smoothing) this endpoint's threat model doesn't need. Not recommended as the first implementation; revisit if the fixed-window boundary effect proves exploitable in practice. |
| Transaction-level advisory locking | Would serialize all rate-limit checks for a given key through a lock instead of relying on the unique-index atomicity above — strictly more contention-prone for no correctness benefit, since `on conflict ... do update` already gives atomic read-modify-write without an explicit lock. Not recommended. |
| External managed limiter (e.g., a CDN/API-gateway-level limiter) | **[Unverified] whether one is available/configurable** for a direct-to-Supabase-Edge-Function call not proxied through Vercel (see "Behavior for proxy/CDN deployment" below) — would need its own evaluation if a proxy layer is ever introduced. Not designed further here. |

## Protect sensitive identifiers — new

**Correction:** the original design stored raw IP addresses and raw phone numbers in
`rate_limit_events.dimension_value`. Revised: never store raw identifiers. Store a keyed HMAC:

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
  also means any in-progress abuse pattern briefly resets to zero at rotation time. Not designed
  further here (no rotation schedule proposed); flagged so it isn't a surprise if rotation is ever
  needed for an unrelated reason (e.g., suspected pepper compromise).

## Prevent targeted phone-number denial — new

**Risk:** a hard per-phone limit, applied naively, lets an attacker who knows (or guesses) a real
customer's phone number submit enough junk requests carrying that phone number to lock the real
customer out of checkout — a denial-of-service against a specific victim, not against the system as
a whole. The original design's flat "5 requests/10 minutes/phone, hard reject" does not defend
against this.

**Correction (this pass):** the prior revision's table described the per-phone-only layer as
escalating to a CAPTCHA challenge unconditionally — but the CAPTCHA launch policy elsewhere in this
same document states CAPTCHA is **not enabled at initial launch**. Describing escalation as active
behavior in one section while another section says the integration doesn't exist yet at launch is a
direct contradiction. Resolved below by splitting the per-phone-only layer's behavior into an
explicit before/after-CAPTCHA-exists distinction, consistent with the CAPTCHA launch policy section.

**Layered mitigation, revised:**

| Layer | Behavior | Reasoning |
|---|---|---|
| Per-IP limit | Hard reject at threshold (e.g., 8/10min — exact number is a business tuning decision, not fixed here) | Cheapest signal; catches unsophisticated bulk abuse; does not single out a victim's phone number |
| Per-IP-plus-phone limit | A tighter combined-key threshold (e.g., 3/10min for the *same* IP+phone pair) | Catches the actual "one attacker hammering one victim's phone from one place" pattern without penalizing the phone number itself |
| Per-phone-only limit — **before CAPTCHA exists** (initial launch, per the CAPTCHA launch policy below) | Present, with a **higher** threshold than IP-plus-phone (e.g., 15/10min). On exceeding it: **observe and log only** (structured log entry, per "Failed-attempt monitoring" below) — **no hard reject, no challenge, request proceeds normally.** | A phone number alone can legitimately see repeated attempts (a real customer retrying after a declined slip, shared-household ordering) — a hard reject here is the exact targeted-denial risk this layer exists to avoid, and there is no CAPTCHA integration yet to offer as a softer alternative. Observing-only at this stage feeds the CAPTCHA escalation policy's own trigger condition without punishing legitimate customers in the meantime. |
| Per-phone-only limit — **after CAPTCHA exists** (post the CAPTCHA escalation trigger, per the launch policy below) | On exceeding the same threshold: require a CAPTCHA challenge rather than a hard reject. A successful challenge permits the request to proceed normally. A failed or missing challenge response is rejected with a `403`-class response (exact status/body a business/UX decision, not fixed here). | Once CAPTCHA exists, escalating to a challenge instead of a hard reject preserves a legitimate customer's ability to eventually get through while still slowing a script — this is the behavior the prior revision described, now correctly scoped to only apply once the integration is real. |
| Idempotency-aware retries | A legitimate retry (same `Idempotency-Key`) never consumes a new rate-limit slot — checked and short-circuited before any rate-limit increment | Prevents the idempotency design and this design from fighting each other; a flaky-network retry storm from one real customer must never look like abuse |

**Trade-off, stated explicitly:** this layering trades simplicity (the original single hard
per-phone cap) for resistance to targeted denial. It is more code and more tuning knobs. The
alternative — keeping a flat hard per-phone cap — is simpler to implement but leaves a real,
named attack this revision closes; recommended to accept the added complexity.

## Database denial-of-service risk — new

The rate limiter itself must not become the thing an attacker uses to degrade the database:

- **Unbounded table growth and cleanup/expiry:** `rate_limit_windows` accumulates one row per
  (operation, dimension, dimension_value, window) combination. Bounded in practice because
  `window_start` buckets requests into fixed time slots — the table's growth rate is a function of
  distinct-identifier traffic volume, not request volume within a window (repeat requests from the
  same identifier in the same window increment an existing row, they don't insert a new one).
  **Correction (this pass):** the prior revision's cleanup assumption hardcoded a fixed 1-hour
  cutoff (`window_start < now() - interval '1 hour'`) independent of what window durations were
  actually in use — silently wrong if a caller ever legitimately requests, say, a 1-day window
  (whose rows would be deleted while still meaningful). Replaced with a per-row `expires_at`
  (schema above), computed at insert time as `window_start + this call's own window_seconds + 1
  hour grace`, so cleanup never has to independently know or guess what window durations exist:

  ```sql
  delete from private.rate_limit_windows where expires_at < now();
  ```

  This scan uses `rate_limit_windows_expires_at_idx` (schema above) and stays correct regardless of
  how many different window durations different callers use, without the cleanup job needing to be
  updated in lockstep every time a window duration changes. **Cleanup schedule:** an operational
  choice, not fixed here (a periodic job — e.g. `pg_cron` — running on the order of every 15-60
  minutes is sufficient; the table's bound is governed by the index-scan cost of this delete, not by
  how promptly it runs).
- **Expensive `count(*)` queries:** eliminated entirely by this design — there is no `count(*)`
  anywhere in the atomic function above; the count is maintained incrementally in
  `request_count`, read directly by primary key, not recomputed by scanning rows.
- **Hot-row contention:** a single wildly popular `(operation, dimension, dimension_value,
  window_start)` key (e.g., a very high-traffic shared IP, such as a corporate NAT gateway or mobile
  carrier CGNAT) could see many concurrent `on conflict ... do update` statements against the same
  row inside the same window, causing lock contention. This is a real, accepted trade-off of any
  atomic-counter approach — the alternative (sharding a single logical counter across multiple rows
  to spread contention) adds real complexity for a problem that, at this project's current and
  reasonably foreseeable traffic scale, does not justify it. Flagged as a scale-dependent design
  revisit, not solved here.
- **Attackers turning the limiter into the bottleneck:** because every `create-order` call — even
  ones that will be rejected — must still perform the atomic increment to be counted, a large-enough
  flood still generates real database write traffic. This is inherent to any server-side counter
  design (in-memory counters would avoid it but are not viable here — Edge Functions are stateless
  across invocations, per the original design's reasoning, unchanged). Mitigation is layered: the
  atomic single-statement design keeps each individual write cheap (one indexed upsert, no scan),
  and the per-IP layer is deliberately the *first* check performed, before any more expensive
  validation work, so a flood is rejected as early and cheaply as possible in the request lifecycle.

## Request body — expanded beyond a `Content-Length` check

**Correction:** a `Content-Length` header check alone is only an early rejection mechanism, not a
complete control, for several reasons that need to be documented separately:

| Concern | Handling |
|---|---|
| `Content-Length` present | Reject if it exceeds the fixed ceiling (e.g. 8 MB, unchanged from the original recommendation) before calling `req.json()`/`req.text()` — cheap, early rejection. |
| Missing `Content-Length` header | A client (or attacker) can omit it or send a chunked-transfer body with no upfront length. The explicit-header check alone does **not** cover this case — the runtime will still buffer/read the body regardless of whether a length was declared. |
| Chunked-transfer encoding | Deno's HTTP server (the Edge Function runtime) does not require `Content-Length` for a well-formed request; a chunked body bypasses a header-only check entirely. Must be handled by **also** enforcing a maximum on the actual bytes read (e.g., reading via a size-limited stream/reader rather than trusting the header alone), not by the header check in isolation. |
| Runtime/platform maximum | Supabase Edge Functions run on Deno Deploy's infrastructure, which has its own platform-level request-size ceiling — **[Unverified]** exact current value; per this project's own skill guidance, must be re-checked against current Supabase/Deno documentation immediately before implementation rather than assumed from training data. The application-level 8 MB ceiling should be set comfortably below whatever that platform maximum is, not treated as the only limit. |
| Post-read encoded (base64) length vs. decoded size | The payment slip arrives as base64 inside the JSON body — base64 inflates size by ~33%. The existing `MAX_SLIP_BYTES = 5 MB` check (11-edge-function-audit.md) already applies to the **decoded** bytes; this design's new 8 MB *request-body* ceiling must stay clearly larger than the base64-inflated size of a 5 MB slip (~6.7 MB) plus JSON overhead, which it is — flagged here only so the relationship between the two limits is explicit rather than assumed compatible. |
| JSON structure limits | Beyond raw byte size, an attacker could send a small-in-bytes but pathologically nested or wide JSON structure (e.g., deeply nested objects, or extremely long strings inside otherwise-small fields) intended to cause expensive parsing/validation rather than exhausting bandwidth. The existing validation (`MAX_ITEMS = 50`, `MAX_QTY_PER_ITEM = 20`, `asTrimmedString` length caps — 11-edge-function-audit.md) already bounds the *fields this endpoint actually reads*; recommend explicitly confirming (not verified this pass — an implementation-time check) that `req.json()`'s own parse step has no separate pathological-nesting risk independent of those field-level caps, since a malicious deeply-nested value in a field that's never read could still cost CPU during parsing itself. |
| Maximum item count | Already enforced (`MAX_ITEMS = 50`) — unchanged, cited here for completeness against this task's checklist, not a new finding. |
| Maximum string lengths | Already enforced per-field via `asTrimmedString`'s caps — unchanged, cited for completeness. |

## CORS — clarified

**Correction:** the original design's CORS entry was purely informational. Restated explicitly per
this task's requirement: **CORS is not authentication and does not stop non-browser clients.** A
wide-open `Access-Control-Allow-Origin: "*"` (as currently deployed) only affects whether a
*browser* enforces same-origin restrictions on JavaScript reading the response — it has zero effect
on `curl`, a script, or any non-browser HTTP client, all of which can call `create-order` directly
regardless of any `Origin` header they choose to send or omit. Restricting CORS to an explicit
allowed-origin list would reduce the surface for a malicious *website* embedding a cross-origin
request against a real customer's authenticated browser session — but since `create-order` has
`verify_jwt: false` and no cookie/session-based auth (11-edge-function-audit.md), there is no
ambient credential for a CSRF-style attack to ride along with in the first place. **Recommendation:
keep CORS wide-open as currently deployed; do not treat restricting it as a rate-limiting or abuse
control** — that job belongs entirely to the atomic limiter above, which applies uniformly
regardless of what `Origin` (if any) a caller presents.

## CAPTCHA launch policy — new, replacing the deferred "add later" stance

**Correction:** the original design left CAPTCHA/Turnstile as "recommended as a follow-up... if
abuse is actually observed," with no policy for when/how it would actually be turned on. Revised
into an explicit, environment-scoped policy:

| Environment | Policy |
|---|---|
| Development | No CAPTCHA. Rate limiting alone (this design) is exercised during development/testing; adding a live CAPTCHA widget to a local/dev build adds friction with no corresponding benefit at this stage. |
| Preview/staging | No CAPTCHA by default, but the integration (if built) should be *testable* here first — i.e., if Turnstile is ever implemented, Preview is where its test/sandbox site key is exercised, not Production. |
| Production launch | **Not enabled at initial launch.** Ship with the atomic rate limiter (this design) and the layered per-phone/per-IP controls above as the initial control set. This is a deliberate choice to avoid adding a third-party dependency and a new user-facing widget speculatively, consistent with the original design's reasoning — restated here as a decision, not an open-ended deferral. |
| Escalation policy | CAPTCHA/Turnstile becomes a **committed follow-up**, not a maybe, once **either** of these is observed post-launch: (a) the per-IP or per-phone-only layers are being hit at a sustained rate suggesting the atomic limiter alone is insufficient, or (b) a targeted-denial pattern (per the "prevent targeted phone-number denial" section above) is actually observed in logs, not just theoretically possible. Whoever operates the project post-launch owns watching for this trigger — not designed as an automated alert here, since no monitoring/alerting infrastructure exists in this repository to hook into (see "Failed-attempt monitoring" below, unchanged from the original design). |

## Failed-attempt monitoring — unchanged from original design

Log (not to the client-facing response) a structured event on every rate-limit rejection and every
validation failure, keyed by the same HMAC'd dimensions as the limiter — `console.error`/
`console.log` already flow to Supabase Edge Function logs (`get_logs service=edge-function`, per
11-edge-function-audit.md). No new logging infrastructure needed, just consistent structured
fields. This is also the input the CAPTCHA escalation policy above depends on.

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

Unchanged risk from the original design: the exact trustworthy header for a client's real IP inside
a custom Edge Function was not fully re-confirmed this pass. `search_docs` documents
`Sb-Forwarded-For` specifically for **Supabase Auth's own** rate limiting, requiring a secret API
key — not directly confirmed applicable to a custom Edge Function's own request handling. **Do not
trust a client-supplied `X-Forwarded-For` naively** — an unauthenticated caller can set that header
to any value it wants, and treating it as the real client IP without a verified trust boundary would
let an attacker forge a victim's IP (defeating the per-IP limit entirely) or continuously rotate a
fake IP value (defeating it just as effectively as having no per-IP limit at all). **The per-IP and
per-IP-plus-phone layers above must not be approved for implementation until this header source is
independently verified against current Supabase/Deno Edge Function documentation** — this design
does not approve IP-based enforcement based on an unverified/untrusted header, consistent with this
task's own instruction. Recommend implementing IP extraction as a single small helper function,
isolated specifically so it can be corrected in one place once the exact current header semantics
are re-verified — this isolation is what feeds the HMAC step above (`normalizedIpOrPhone` for the
`ip` dimension depends on this helper being correct). The per-phone-only and idempotency-aware-retry
layers do not depend on IP extraction and are not blocked by this.

## What is explicitly not designed here

- Exact numeric thresholds (requests per window, per dimension) — a product/business tuning
  decision, not a schema or architecture one.
- Turnstile/CAPTCHA integration implementation details (widget wiring, siteverify call) — the launch
  *policy* above is new; the integration itself remains a future follow-up per that policy.
- Any change to `create_order`'s own RPC body or to `products`/`orders`/`settings` — this control
  lives entirely in the Edge Function layer plus two new `private`-schema objects (table + function),
  identical in spirit and schema location to the idempotency design's footprint.
- The rate-limit cleanup job's exact scheduling mechanism — an operational choice, not a schema one.
- The pepper's storage/generation mechanism beyond "an Edge Function secret" — provisioning details
  are an implementation task, not a design decision.
