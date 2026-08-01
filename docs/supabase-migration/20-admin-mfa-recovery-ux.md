# 20 — Admin MFA Recovery UX and Enforcement Status

Status update to `16-first-owner-and-mfa-runbook.md` steps 6a–6e, written alongside the
implementation in `20260801175838_add_granular_authorization_roles.sql` (roles/grant/revoke) and
`src/pages/AdminPage.tsx` (frontend enrollment/challenge UI). This file records what changed and
documents the recovery-UX decision that 16's step 6f left open.

## 1. What 16 flagged as open, and current status

| Runbook step | Previous status | Current status |
|---|---|---|
| 6a. MFA enrollment | Not built | Implemented: `EnrollAdminMFA` in `AdminPage.tsx`, using `supabase.auth.mfa.enroll({ factorType: 'totp' })` → `challenge()` → `verify()`, per the current Supabase Auth TOTP guide. Shown automatically to any privileged (admin/owner) session with no verified TOTP factor. |
| 6b. MFA challenge | Not built | Implemented: `AdminMFAChallenge` in `AdminPage.tsx`, shown to a privileged session that has a verified factor but is at `aal1`. |
| 6c. Assurance-level verification | Documented method only | Implemented exactly as documented: `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`, read on initial load and after every `onAuthStateChange` event via `refreshAuthorization()`. |
| 6d. RLS/RPC enforcement for high-risk operations | None existed | Implemented, but scoped narrower than "every admin policy": `public.grant_role()` and `public.revoke_role()` (the only two Base-level privileged *mutations* introduced this phase) require `(select auth.jwt() ->> 'aal') = 'aal2'` in the function body, in addition to the existing `private.is_admin()`/`private.is_owner()` checks. Read-heavy existing admin surfaces (`orders`, `products` RLS) are unchanged — see "Scope of aal2 enforcement" below for why. |
| 6e. UI redirection for an `aal1` administrator | Not built | Implemented: the frontend gate order in `AdminPage.tsx` is sign-in → (no verified factor → `EnrollAdminMFA`) → (`aal1` with a factor → `AdminMFAChallenge`) → dashboard. A privileged session can never reach dashboard content without a verified `aal2` session. |

## 2. Scope of `aal2` enforcement (a deliberate boundary, not an oversight)

The Base requirement is "administrator MFA readiness" — the phase-ownership document does not say
every existing admin-gated table must become `aal2`-only. This pass applies the "opted-in"
restrictive pattern from Supabase's own MFA guide conceptually, but the concrete integration point
chosen is: **the two new privileged mutation RPCs require `aal2`; the frontend blocks all admin
dashboard rendering behind `aal2`.** This means, in practice, every privileged operation reachable
through the built application UI already requires MFA (because the UI itself won't render without
it), without rewriting every existing RLS policy on `orders`/`products`/`settings` to add a
`restrictive` `aal2` clause. Retrofitting `aal2` directly onto those policies is a reasonable Floor 7
("complete RLS audits") follow-up if the user later wants defense-in-depth against a stolen `aal1`
token used directly against the REST API (bypassing the frontend entirely) — noted as an open item,
not implemented here, since it was not named as a Base requirement and reworking already-shipped,
tested RLS policies mid-phase risks exactly the kind of unrequested scope creep this project's
process has repeatedly flagged.

## 3. Recovery-safe UX decision (resolves 16's step 6f)

Supabase Auth's MFA implementation does not provide "backup recovery codes" the way some other
identity providers do — the only first-class recovery primitive is **another privileged party
unenrolling the lost factor** (`supabase.auth.mfa.unenroll()`, callable only from an `aal2` session
belonging to that user, or via the Auth admin API from a trusted backend context), after which the
user re-enrolls a new factor via the flow in section 1.

Given that, and consistent with 16's own framing ("the project owner always retains Supabase
Dashboard access independent of application-level `app_metadata` state"), this pass adopts the
following as the documented recovery procedure — a decision, not an implementation, since it
requires no new code beyond what already exists in sections 1–2 above:

1. **A locked-out admin/owner contacts another owner.** No self-service recovery exists by design —
   a factor reset must always be authorized by a second privileged party, matching the "controlled
   grant/revoke" spirit of the Base role model (no single party should be able to silently
   re-provision their own privileged access).
2. **The owner unenrolls the lost factor** for the affected account via the Supabase Dashboard
   (Authentication → Users → the affected user → manage MFA factors) or, if a trusted server-side
   script context is available, `supabase.auth.admin.*` with the `service_role` key — never from
   browser code.
3. **The affected admin/owner signs in again and re-enrolls** via `EnrollAdminMFA`, same as first-
   time setup.
4. **If every owner is simultaneously locked out** (the only scenario this project has no in-app
   recovery for), the Supabase Dashboard itself is the backstop: Dashboard access is a separate
   credential (the Supabase account login), independent of any `auth.users` row or `user_roles`
   grant in this project's own database, and can always reach Authentication → Users to reset a
   factor directly.
5. **No TOTP secret is ever stored by this application** — `supabase.auth.mfa.enroll()`'s response
   (QR code / secret) is rendered once, client-side, for the enrolling user to scan, and is never
   persisted to any application table, log, or evidence file. This satisfies the Base requirement
   directly ("no storage of TOTP secrets in application tables or logs").

## 4. What remains open (not resolved by this pass)

- **6g, session revocation procedure** — unchanged from 16; still requires the Auth admin API from a
  trusted context, not implemented as an in-app feature (would need a service-role-backed edge
  function or server script, out of scope for a frontend/RLS Base pass).
- **Retrofitting `aal2` onto existing `orders`/`products`/`settings` RLS policies** — see section 2;
  an explicit, deferred Floor 7 candidate, not a Base gap.
- **Phone/SMS MFA** — not implemented; TOTP only, matching the free/always-enabled factor type per
  Supabase's docs. Adding phone MFA would require SMS provider configuration this project does not
  have and was not asked for.
