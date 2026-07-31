# 09 — Foundation Decisions

All items below are **Open** unless marked otherwise. None have been silently resolved in code.

**Correction (2026-08-01, Foundation Correction Commit and Local-Execution Preparation pass):** this
pass added no new decision items and resolved none of the existing ones — it corrected technical
defects in the idempotency/abuse-control designs referenced by decisions elsewhere in this repository
and authored one new, not-yet-applied migration (`20260801120000_restrict_profile_updated_at_grant.sql`,
see 08-migration-risks.md Risk 6). Applying that migration to the remote project is itself an
additional decision requiring explicit approval, not covered by any existing numbered item below —
recorded here so it isn't lost: **"Apply the `updated_at` grant-restriction migration to the remote
project" — Open, not approved.**

## 1. Guest checkout model
**Why it matters:** determines whether `profiles`/`auth.users` rows are required to place an
order at all.
**Verified current behavior:** checkout requires no Supabase Auth session — `OrderDraft`/
`OrderPayload` carry customer contact fields directly, no `user_id`. `public.orders` has no
`user_id` foreign key (verified via `list_tables`).
**Options:** (a) keep fully guest, no account ever required; (b) optional account creation
post-order; (c) require account.
**Recommended option:** (a), unchanged — matches current, working behavior; introducing accounts
is out of this task's scope anyway.
**Migration impact:** none if (a).
**Security/UX impact — corrected 2026-07-31 (do not read as "none"):** guest checkout, as currently
implemented, has concrete downstream consequences that were understated in the original pass:
- **Order ownership:** `public.orders` has no `user_id` column and no RLS policy grants any
  customer read access to their own order (verified via `pg_policies` — only `Admins can
  read/update/delete orders` exist for `orders`; there is no customer-facing SELECT policy at
  all). A customer cannot look up their own order through the Data API today, guest or not.
- **Order lookup:** with no ownership link, any "track my order" feature would have to be built as
  a separate token/code-based lookup (e.g., order_code + phone/email match via a dedicated RPC),
  not a simple `auth.uid()` RLS predicate — a real design constraint for a later floor, not a
  currently-solved problem.
- **Slip ownership:** payment slips are keyed by `orderId` (a UUID) in the bucket path, with no
  link back to a customer identity either — same gap as order lookup.
- **Cross-device / resubmission access:** a guest who starts checkout on one device has no way to
  resume, view status, or resubmit a rejected slip from another device without the system storing
  and them retaining the raw `order_code`.
- **Abuse prevention:** guest checkout with no account and no rate limiting found in `create-order`
  (see 11-edge-function-audit.md) means the only anti-abuse control today is the honeypot field —
  a determined actor could submit unlimited orders.
- **Customer PII:** name/phone/email/address are captured per-order with no account-level identity
  to consolidate, correct, or delete PII across orders from the same person (relevant for any
  future data-subject-request/GDPR-style handling).
**Status:** Open — kept Open per correction-pass instruction; the above is impact documentation,
not a resolution.

### Correction (2026-08-01, Foundation Closure pass) — full option analysis

This task's Phase 12 requires a structured comparison of three concrete ownership models before
Floor 1 can be authorized. None of the three is implemented or approved below — this is analysis
only, status remains **Open**.

**Option A — Fully guest, secure order-access token.** No Auth user is ever created. `orders`
gains a high-entropy token column; only its *hash* is stored server-side (e.g.
`order_access_token_hash`), the raw token is returned once at checkout time and otherwise
unrecoverable. A "my order" lookup RPC validates the raw token against the stored hash before
returning the row — never a direct RLS-filtered `select`, since there is no `auth.uid()` to filter
on.

**Option B — Anonymous Supabase Auth.** Before checkout, the client silently creates an anonymous
Auth identity (`supabase.auth.signInAnonymously()`). `orders.user_id` references that identity.
Ordinary ownership-predicate RLS (`auth.uid() = orders.user_id`) applies exactly like a normal
account. The anonymous identity can later be upgraded to a real account (`updateUser` with email +
password, preserving the same `user_id` and therefore all past orders).

**Option C — Required customer account.** No checkout without a verified sign-up (email/password
or OTP) first. `orders.user_id` is `not null`, same ownership-predicate RLS as Option B, no
anonymous-identity bookkeeping needed.

| Dimension | A — Guest + token | B — Anonymous Auth | C — Required account |
|---|---|---|---|
| Checkout friction | Lowest — identical to current flow, zero new steps | Low — one silent background call, no user-visible step | Highest — a real signup gate before every first purchase; directly contradicts the current, working guest-checkout UX |
| Order ownership | Token-based, not identity-based — possession of the token *is* ownership | True identity-based via `auth.uid()` | True identity-based via `auth.uid()` |
| Cross-device access | Only if the customer independently saved/received the token (e.g. emailed order confirmation) | Only if the anonymous session/local storage is available on that device, or the customer converts to a real account first | Full — sign in anywhere |
| Slip ownership | Same token model extended to slip resubmission endpoints | Tied to `auth.uid()`, same as order | Tied to `auth.uid()`, same as order |
| Review eligibility (decision 13) | Possible but requires the token to still be presentable at review time — awkward UX for a review left days/weeks later | Natural — `auth.uid()` ties order → review eligibility directly, survives account conversion | Natural, same as B |
| Cancellation | Token holder can cancel — same "possession = authority" risk as lookup | Owner can cancel via normal RLS `update` policy | Same as B |
| Rejected-slip resubmission | Token re-presented to a resubmission RPC | Owner resubmits via normal RLS-gated `update`/insert flow | Same as B |
| Abuse risk | Token could leak via email forwarding/shoulder-surfing/browser history; mitigated by hashing at rest + expiry/rotation, not by RLS | Anonymous identities are cheap to mint in bulk — needs its own rate limiting (same class of problem as `create-order` itself, see decision on abuse controls in 18-create-order-abuse-controls.md) unless paired with CAPTCHA/Turnstile | Lowest abuse surface — real signup is itself a soft rate limit, but at the cost of conversion/friction |
| Data-retention impact | No account to delete — PII lives solely on the order row, cleanup means per-order deletion, no consolidated "delete my data" story | Anonymous users accumulate in `auth.users` indefinitely unless cleaned up — needs a scheduled job to prune abandoned/never-converted anonymous identities | Cleanest retention story — one identity, one deletion request, cascades via existing FK |
| Migration impact | Additive: new nullable token-hash column + one RPC. No existing behavior changes. | Additive: `orders.user_id` nullable FK to `auth.users`, RLS policy addition. Requires enabling anonymous sign-ins in Supabase Auth settings (a project-level toggle, not just a migration). | Additive schema-wise, but `not null` on `user_id` is a breaking behavior change to the live checkout flow — cannot be done without also shipping a signup UI, which does not exist today |
| RLS complexity | Higher — cannot use a simple ownership predicate; needs a `SECURITY DEFINER` (or careful `SECURITY INVOKER` + RPC) lookup function that checks a hash, which is a more sensitive piece of code to get right than a one-line `auth.uid() = user_id` policy | Lowest — reuses the exact ownership-predicate pattern already used for `profiles` | Same as B |

**Recommendation (not approved):** **Option B (anonymous Supabase Auth)**. It preserves the
current low-friction guest UX (no visible signup step) while giving every order a real,
RLS-ownable identity — which directly unblocks the order-lookup gap, the review-eligibility
dependency (decision 13), and cross-device access via later account conversion, none of which
Option A solves without hand-rolled token machinery duplicating what Supabase Auth already does
safely. Option C is rejected as a recommendation outright — it would change the storefront's
current, working checkout behavior, which the safety rules for this task explicitly forbid touching
without separate approval. This recommendation requires enabling anonymous sign-ins in the Supabase
Auth project settings (a dashboard-level, project-wide toggle — out of reach of this agent via any
available tool) and a decision on abandoned-anonymous-identity cleanup before implementation.
**Status remains Open — this is a recommendation for user approval, not a decision.**

### Reconciled status block (2026-08-01, Foundation Evidence Reconciliation pass)

```text
Guest ownership: Open
Preferred candidate: Option B — Anonymous Supabase Auth
Anonymous Auth enablement: Not approved
```

This directly resolves a contradiction the prior pass introduced: this section (Decision 1)
recommended Option B, while Decision 2 immediately below said "do not enable anonymous auth" with
no qualifier — read together they looked like two different answers to the same question. They are
not actually in conflict once stated precisely: **Option B is the preferred candidate for a future
decision; enabling it today is not approved.** Decision 2's "do not enable" language was correct as
a statement about *today* but has been rewritten below to say so explicitly, rather than reading as
a standing rejection of Option B.

If Option B is ever approved, note for implementation (not designed in full here — this is decision
scope, not schema scope):
- Anonymous sign-ins receive a real Auth user ID (`auth.users` row, `is_anonymous = true`) and use
  the same Postgres `authenticated` database role as a permanent account — RLS policies that only
  check `to authenticated` (not an ownership predicate) cannot distinguish an anonymous user from a
  real one; every existing `to authenticated` policy in this project already pairs that with an
  `auth.uid() = ...` ownership check (verified in 12-rls-and-authorization-audit.md), so this
  project's current policy style is already compatible, but any *new* policy added for Option B
  must not rely on `to authenticated` alone as if it implied a "real" signed-up user.
- A guest who clears browser storage, uses a different browser, or switches devices before
  converting the anonymous identity to a permanent account (email/phone link) loses access to that
  identity and therefore to their order — this is a real UX regression risk versus the current
  fully-guest flow and needs an explicit product decision, not just a technical one.
- Anonymous identities need the same abuse protection as any other cheap-to-mint identity (see
  18-create-order-abuse-controls.md) — minting one is free, so a naive implementation could be used
  to defeat any per-account rate limit.
- Abandoned (never-converted) anonymous identities accumulate in `auth.users` indefinitely unless a
  cleanup job prunes them — not designed here, flagged as a prerequisite for approval.
- An anonymous identity may later be linked/upgraded to an email, phone, or OAuth identity via
  Supabase Auth's own identity-linking flow, preserving `user_id` and therefore order history.

## 2. Anonymous Supabase Auth usage
**Why it matters:** anonymous sign-ins share the Postgres `authenticated` role with real users,
which breaks `auth.role() = 'authenticated'`-style checks (deprecated pattern) if ever used.
**Verified current behavior:** no anonymous auth usage found in the code read this session.
**Recommended option:** do not enable anonymous auth **today, unilaterally, as part of this
foundation-closure/reconciliation task** — enabling it is a project-level Supabase Auth dashboard
change with product-wide consequences (see decision 1's reconciled status block above) and requires
explicit user approval, not a recommendation against Option B as a future direction. If
`current_user_is_admin()`-style helpers are added later, they must check `app_metadata`, never bare
role membership. **Status:** Open — consistent with decision 1, not contradicting it.

## 3. Stock-reservation duration
**Why it matters:** relevant once inventory/orders get true reservation logic — not applicable
yet since this task doesn't touch `orders`/`products` behavior.
**Verified current behavior:** no reservation mechanism exists; stock is checked (softly,
client-side) and presumably decremented atomically server-side per the "atomic order creation"
migration name, unverified in detail this pass.
**Status:** Open, explicitly deferred to Floor 1 (Catalog/Inventory) — out of scope here.

## 4. Order-number format
**Verified current behavior:** `orders.order_code text unique` exists; generation logic lives in
the (unread this pass) `create-order` edge function or `src/lib/order.ts`. **Status:** Open,
deferred — not a foundation-stage concern.

## 5. Customer-account requirements
Same as #1 — tied to guest-checkout decision. **Status:** Open, deferred.

## 6. Staff role hierarchy — the decision that actually blocks Phase B

**Why it matters:** this is the one open decision with immediate, concrete impact on what I can
safely implement in this task.
**Verified current behavior:** admin authorization today is a single boolean-ish check —
`app_metadata.role === 'admin'`, read client-side (`AdminPage.tsx:47-48`) and (per prior verified
session state, not re-confirmed this pass) server-side via `private.is_admin()` in RLS policies on
`products`/`orders`/`settings`. There is exactly one privileged role today: admin. No `support`,
`inventory_manager`, `payment_reviewer`, or `owner` distinction exists anywhere in the current
system.
**Available options:**
  - **(a)** Build `public.user_roles` exactly as Phase B specifies (6-role model), and treat it as
    the *new* source of truth — meaning `private.is_admin()` and every existing RLS policy that
    calls it would need to be migrated to check `user_roles` instead of `app_metadata.role`, in
    the same or an immediately-following change, so there's never a window with two disagreeing
    authorities. This is real, non-trivial follow-on work touching already-shipped RLS policies —
    arguably no longer "foundation only."
  - **(b)** Build `public.user_roles` as specified, but scope it to **not yet be consulted by any
    existing policy** — pure schema-and-RLS-on-itself, wired up later when a second real role
    (e.g., `payment_reviewer`) is actually needed. Leaves `app_metadata.role`-based admin checks
    as the sole live authority for now. Lower risk, but means `user_roles` sits unused until a
    follow-up task connects it — some wasted-motion risk if the eventual design differs from what's
    built now speculatively.
  - **(c)** Skip `user_roles` in this task entirely; keep the existing `app_metadata.role`
    single-admin model as-is, and revisit the multi-role hierarchy when a second privileged role
    is actually needed (support/inventory/payment-reviewer are all still hypothetical — nothing in
    the current product requires them yet).
**Recommended option:** **(c)**, with `public.profiles` still built now (it's genuinely net-new,
uncontested, and low-risk). Reasoning: options (a) and (b) both build real schema for five roles
that have no current consumer, ahead of the "no premature implementation" principle this task
itself states for the ecommerce tables — the same principle applies to speculative authorization
scaffolding. (a) additionally requires touching live RLS policies this task was told to leave
alone.
**Corrected status (2026-07-31):** the narrow sub-question — *"should this task build
`public.user_roles` right now?"* — was put to the user directly via an `AskUserQuestion` prompt in
the prior session ("How should I handle the requested `public.user_roles` (6-role hierarchy)
table..."), and the user selected **"Skip user_roles for now (Recommended)"** — i.e. option (c)
above. This is direct conversation evidence, not an inferred or assumed decision, and `profiles`
was built while `user_roles` was not, consistent with that answer (verified via `list_tables`:
`public.profiles` exists, `public.user_roles` does not). **This sub-decision is APPROVED:
option (c), do not build `user_roles` in this task.** The broader question this section is titled
after — the eventual multi-role hierarchy design (support/inventory_manager/payment_reviewer/
owner) — was never itself decided, only deferred, and **remains Open** for whenever a second
privileged role is actually needed.
**Migration impact:** (a) touches existing policies (real risk); (b)/(c) do not. **Security
impact:** (a) has a real cutover-window risk if done carelessly; (b) is inert so no impact; (c) is
status quo.

## 7. Administrator MFA
**Verified current behavior:** no MFA enforcement found; `auth.mfa_factors` table exists (stock
Supabase Auth schema) but 0 rows — no factors enrolled by anyone.
**Recommended option:** defer full enforcement; if `profiles`/`user_roles` foundation is approved,
add a `current_user_has_mfa()` helper stub now (cheap, additive) so future policies can require it
without a later schema change. **Status:** Open.

## 8. Local/staging/production environment strategy
**Why it matters:** blocks Phase B1 (local Supabase structure) as specified.
**Verified current behavior:** no `supabase/` directory, Supabase CLI not installed in this
environment, no staging project referenced anywhere in the repo (only one project ref,
`jguewximloxmbhpsoxjb`, found across `.env.example`/memory/MCP calls).
**Options:** (a) install/authenticate the Supabase CLI in this environment and `db pull` the real
migration history before writing any new migration files; (b) hand-author migration files now
that describe only *new* objects (profiles etc.) without claiming to represent the 3 existing
migrations, accepting that local `supabase db reset` won't fully reproduce the remote schema until
someone later backfills the missing history; (c) do all further schema work directly via MCP
`execute_sql`/`apply_migration` against the remote project only, skip local-first entirely for now.
**Recommended option:** (b) — write new migration file(s) covering only what this task adds, note
the gap explicitly (as done in 08-migration-risks.md), and flag CLI installation as a separate
follow-up. Avoids fabricating history I can't verify while still moving forward incrementally.
**Status:** Open — recommendation given, proceeding on it only with acknowledgment in the final
report, not silently.

## 9. Supabase schema exposure strategy
**Verified current behavior:** `public` is exposed (products/orders/settings all live there and
are queried via the Data API from the frontend). No `private` or `audit` schema currently
confirmed to exist (see verification gap in 03/05).
**Recommended option:** keep `public.profiles` exposed (customers need to read their own row via
the Data API); if `user_roles` is ever built, keep it in a schema **not** exposed to
`anon`/`authenticated` directly, or rely on RLS being strict enough that exposure is safe either
way — RLS is required regardless of exposure per the skill's own security checklist.
**Status:** Open (contingent on decision 6).

## 10. Historical Google-data migration scope
**Verified current behavior:** no historical data migration occurred in commit `8f484cf` —
`products` starts fresh (5 rows, clearly seed/demo data, not a bulk import) and `orders` at 0 rows.
**Corrected status (2026-07-31):** "Not applicable" was the wrong classification — the Apps
Script source no longer being in the working tree does not mean historical order/product data no
longer exists anywhere. The live Google Sheet, the Apps Script deployment, and any manual exports
are external resources this repository inspection cannot see or rule out. **Status: Open —
external source verification required.** Someone with access to the original Google Sheet/Drive
account needs to confirm whether any pre-cutover order history exists and whether it should ever
be backfilled into `public.orders`.

## 11. Existing payment-slip migration
**Corrected status (2026-07-31):** same correction as #10 — "Not applicable" assumed the absence
of local repo evidence means no slips exist, which does not follow. **Status: Open — external
Drive/storage verification required.** The Drive folder referenced by the old `DRIVE_FOLDER_ID`
script property may still contain slip files shared `ANYONE_WITH_LINK` (see
01-google-backend-map.md) — this repo cannot enumerate or migrate them; someone with Drive access
needs to check.

## 12. WhatsApp provider
**Verified current behavior:** `VITE_CLIENT_WHATSAPP_NUMBER` + a client-built `wa.me`-style
message (`buildWhatsAppMessage`, `src/lib/order.ts`, not opened this pass) — no provider API
integration, just a link/deep-link pattern. **Status:** Open, deferred — no queue or automation
exists yet, consistent with "no premature implementation."

## 13. Review eligibility rule
**Corrected status (2026-07-31):** "Not applicable" understated this — reviews don't exist yet,
but the eligibility *rule* (e.g., "only a customer who received a delivered order for this
product may review it") depends directly on decision 1 (guest checkout / order ownership) being
resolved first, since without an ownership link there is no way to verify a reviewer actually
purchased the product. **Status: Open — deferred to Reviews phase**, but flagged as
downstream-blocked by decision 1, not independent of it.

## 14. Backup recovery objectives
**Verified current behavior:** [I cannot verify this] — Supabase project-level backup
configuration (PITR, backup retention) was not queried this session; no MCP tool used here
exposes that setting directly. **Status:** Open, needs a dashboard check, not a code-survey item.

## 15. Production cutover strategy
**Corrected status (2026-07-31):** "Largely moot... already done" overstated what a single git
commit proves. `8f484cf` proves the *code* was changed in this repository — it does not prove
that a production deployment was rebuilt from this code, that DNS/hosting points at that build, or
that live `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` environment variables in whatever
hosting platform serves the real site match project `jguewximloxmbhpsoxjb`. None of that is
observable from this repository or from the Supabase MCP tools available here. **Status:
Unverified — deployment and live-environment evidence required.** See
13-environment-classification.md for the full reasoning on why the live/production status of this
project cannot be confirmed from available evidence. Still separately open for any *future*
cutover of a `user_roles`-based authorization model onto the existing `app_metadata`-based one,
contingent on decision 6.

## 16. Environment classification (new, 2026-07-31 correction pass)
See 13-environment-classification.md for full evidence.

**Correction (2026-08-01, Foundation Evidence Reconciliation pass):** the prior wording here
("Classification, corrected 2026-08-01: Development") overstated what the evidence supports. Per
this task's own required classification language, "Development" may only be used once the user has
explicitly confirmed it — direct evidence in this pass only *rules out* Production and *rules out*
this project currently serving live Staging traffic; it does not, by itself, positively establish
Development over a more formal Staging label. Corrected classification:

```text
Development Candidate — Awaiting User Confirmation
```

Evidence (unchanged from 13-environment-classification.md): the live public Vercel deployment's own
served JS was fetched and inspected, contains zero references to `jguewximloxmbhpsoxjb`/`supabase`
and does contain `GOOGLE_APPS_SCRIPT`; `dotfumes.com` does not resolve in DNS at all; the
Supabase-migration commit has only ever reached Vercel's SSO-gated Preview environment, never
Production. This evidence is real and directly observed — what changed in this correction is only
the *label* applied to it, not the underlying facts. Must be confirmed by the user before being
treated as a settled fact for any remote-affecting decision.
