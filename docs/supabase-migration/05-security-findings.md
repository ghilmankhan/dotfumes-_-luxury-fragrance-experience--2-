# 05 — Security Findings

Verified by code inspection (`src/lib/*`, `src/pages/AdminPage.tsx` partial,
`src/services/orderSubmissionService.ts`, `.env.example`) and `mcp__supabase__get_advisors
type=security`, which returned zero lints. An empty advisor result means Supabase's own linter
found nothing at scan time — it does **not** mean "confirmed secure"; advisors don't catch
application-level logic issues, only a specific known set of Postgres/Supabase misconfigurations.

## Critical

None found in the code paths inspected this session.

## High

- **No admin user exists yet in Supabase Auth** (`auth.users`: 0 rows, verified via
  `list_tables`). The admin login UI (`AdminPage.tsx`) and its RLS-gated data access are deployed
  and reachable, but there is no way to actually authenticate as admin in production right now.
  This isn't an exploitable vulnerability (opposite problem — nothing is accessible), but it means
  the "admin auth migration" claimed complete by commit `8f484cf` is **UI/RLS-complete but
  operationally incomplete** — no one can use it until an owner creates the first Auth user and
  sets `app_metadata.role = 'admin'`. Carried over from prior verified session state, re-confirmed
  this pass via `auth.users` row count.

## Medium

- **RESOLVED this pass — `private.is_admin()` verification gap closed.** Direct `execute_sql`
  against `pg_proc`/`pg_get_functiondef` (correction pass, 2026-07-31):
  ```sql
  CREATE OR REPLACE FUNCTION private.is_admin()
   RETURNS boolean LANGUAGE sql STABLE
   SET search_path TO ''
  AS $function$
    select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
  $function$
  ```
  Verified: `security_definer = false` (it is **SECURITY INVOKER**, not DEFINER — the "SECURITY
  DEFINER functions in public are callable by all roles" risk does not apply, since it never
  bypasses the caller's own privileges), fixed empty `search_path`, reads only
  `app_metadata` (not `user_metadata` — correct per the anti-pattern check), `STABLE`. Grants:
  `EXECUTE` is held by `PUBLIC`, `anon`, `authenticated`, `postgres` (`information_schema.routine_privileges`)
  — this is expected and safe for a SECURITY INVOKER function that only reads the caller's own JWT;
  it cannot be used to read or affect another user's data. **Every** admin-gated RLS policy found
  on `orders`/`products`/`settings`/`storage.objects` (verified via `pg_policies`, 12 policies
  total) calls `private.is_admin()` as its sole authority — there is exactly **one** authorization
  source of truth in the live database, no drift found between tables. See
  12-rls-and-authorization-audit.md for the full policy-by-policy table.
- **Client-side admin gate duplicates but does not replace server-side enforcement** — `AdminPage.tsx:47-48`'s
  `isAdminSession()` check is UI-only (controls what renders); if the underlying RLS policies on
  `products`/`orders`/`settings` were ever weakened, the client-side check would not protect the
  data. This is normal/expected Supabase architecture (RLS is the real boundary), not a
  deficiency — noted here only because it wasn't independently re-confirmed this session (same
  gap as above).

## Low

- **TS/Postgres status-value mismatch** (`OrderStatus`/`PaymentStatus` unions vs. DB check
  constraints — see 03-data-model-inventory.md). Not a security hole, but a correctness risk: if
  the client ever writes a status value the DB doesn't accept, the write fails; if the client
  trusts a status value the DB never produces, UI could show incorrect state. Low severity because
  the client currently never writes status directly (server-authoritative per 02).

## Informational

- `sessionStorage['dotfumes-last-order']` holds customer PII (name, email, phone, address) for the
  browser session (`src/lib/storage.ts`). Standard pattern for an order-confirmation page; not
  flagged as a vulnerability, just noted as a place PII briefly lives client-side.
- `.env.example` correctly documents the "never put service_role in a `VITE_` var" rule inline as
  a comment — good practice already in place, not a finding, but worth recording as a positive
  control.

## New finding this pass (Medium) — historical Drive slip exposure

The predecessor Google backend uploaded every payment slip to Drive with
`file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)` (verified via
`git show 8f484cf^:apps-script/dotfumes-order-webapp.gs:1109` — see 01-google-backend-map.md).
Any slip URL that leaked (browser history, forwarded email, logs) was viewable by anyone, with no
authentication. This is a **closed** risk for future orders (the Supabase bucket is private,
verified `public: false`), but any slip files still sitting in the original Drive folder remain
exposed under the old sharing setting — this repo cannot verify or remediate that, since the
Drive folder is an external Google resource. Tracked as an open decision, not fixed here (see
09-foundation-decisions.md, "Existing payment slips").

## New finding this pass (`create-order` audit) — includes 2 P1 findings, corrected 2026-08-01

**Correction (2026-08-01, Foundation Evidence Reconciliation pass):** this section previously
stated "No P0/P1 findings," which directly contradicted 11-edge-function-audit.md's own summary
(`## Summary by severity`), which lists two P1s: **no idempotency/replay protection** (a retried
request creates a second, distinct order and double-decrements stock) and **no application-level
rate limiting** on a fully anonymous, unauthenticated endpoint. That was a drafting error in this
file, not a re-assessment — 11's findings were correct at the time and remain correct now. Corrected
here to match: **0 P0, 2 P1, 3 P2/informational** (see 11-edge-function-audit.md for the full table).
Both P1s have since had *designs* written (17-order-idempotency-design.md,
18-create-order-abuse-controls.md) — **neither is implemented**; `create-order`'s deployed behavior
is unchanged from what 11 audited.

The edge function source was fetched and read in full this pass (`mcp__supabase__get_edge_function`).
Full classified writeup in 11-edge-function-audit.md. Headline: pricing, stock,
and order-code generation are resolved entirely server-side inside `public.create_order`
(`SECURITY INVOKER`, executed under the edge function's `service_role` connection, `EXECUTE`
granted only to `postgres`/`service_role` — not callable by `anon`/`authenticated` via PostgREST
RPC), matching the code comment in `orderSubmissionService.ts:47-48` that was previously
"reported but not independently verified." **VERIFIED** this pass, not just reported.

## Explicitly not claimed

Per the verification directive, I am not stating that RLS on `products`/`orders`/`settings`,
the `create-order` edge function's server-side validation, or `private.is_admin()` are
"production-ready" as a whole — this pass verified their SQL definitions, grants, and policy
wiring directly (no longer a gap for `is_admin()` or the RLS policy set — see above), but did
**not** execute a live test order end-to-end, did not attempt an authenticated cross-user RLS
probe against real rows (no `auth.users` rows exist to test with — 0 rows, unchanged), and did
not load-test concurrent stock decrements. Those remain unverified. The zero-result security
advisor scan (re-run this pass, still 0 lints) and the SQL definitions read directly this pass are
real evidence for the specific claims made above; they still do not amount to a full security
clearance for the system as a whole.
