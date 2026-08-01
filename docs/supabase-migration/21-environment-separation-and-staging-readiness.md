# 21 — Environment Separation and Staging Readiness

Base Phase 4 deliverable: everything that can be prepared locally, without creating or mutating a
remote Supabase project. Current linked project (`jguewximloxmbhpsoxjb`) is untouched by this
document — nothing here writes to it.

## 1. Current state (evidence, not aspiration)

Per `13-environment-classification.md`: exactly **one** Supabase project reference
(`jguewximloxmbhpsoxjb`) exists anywhere in this repository (`.mcp.json`, `supabase/config.toml`),
classified **Development Candidate — Awaiting User Confirmation**. Production is ruled out by direct
evidence (the one public deployment serves the old Google Sheets backend, not Supabase). No staging
project, no staging Vercel/hosting alias, and no CI deploy pipeline targeting any Supabase project
exist. This document does not change that state — it prepares the workflow for when a second
(staging) and third (production) project exist.

## 2. The three-tier model this project targets

| Tier | Supabase project | Who/what points at it | Data |
|---|---|---|---|
| **Local** | Ephemeral, Docker-only (`supabase start`) | Every developer's own machine; this repo's `supabase/config.toml` | Disposable — reset freely (`supabase db reset`) |
| **Staging** | A dedicated, persistent hosted Supabase project, distinct project ref from production | A hosting preview/staging deployment (e.g. a Vercel Preview alias) | Synthetic/test data only, never real customer PII |
| **Production** | A dedicated, persistent hosted Supabase project, distinct project ref from staging | The live public site | Real customer/order data |

**The one rule this entire document exists to enforce: no project ref is ever shared between two
tiers.** Reusing one Supabase project as both "staging" and "production" (or worse, pointing a
public deployment at the same project developers link locally) defeats the purpose of having tiers
at all — a staging-only migration mistake or a load test could then touch real customer data. Today
there is only one project, so by definition **no** public/staging deployment may be pointed at it
until a second, dedicated project exists — see the blocker in section 6.

## 3. Environment variables — reference and safe-template guidance

The frontend's only two required Supabase variables (`src/lib/config.ts`, `src/lib/supabaseClient.ts`):

| Variable | Safe for browser? | Where its real value lives |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Vercel/host's per-environment env var UI (Production vs. Preview/staging), never committed |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes (publishable key, not `service_role`) | Same as above |
| `VITE_BASE_URL`, `VITE_CLIENT_WHATSAPP_NUMBER`, `VITE_CLIENT_ORDER_EMAIL` | Yes (non-secret business config) | `.env.example` documents safe placeholder defaults |

A single `.env.example` (already committed, already correctly scoped — see its own header comment)
is the right artifact for **all three** tiers, because the required variable *names* are identical
across local/staging/production; only the *values* differ, and those values belong in each
environment's own secret store, never in a second checked-in template file. Creating separate
`.env.staging.example`/`.env.production.example` files would just duplicate the same two lines with
no new information — rejected as unnecessary scope.

**Never**, in any environment: a `service_role`/secret key under a `VITE_`-prefixed name (Vite
bundles every `VITE_*` variable into the client). `src/lib/config.ts` now runs a dev-only startup
check (`import.meta.env.DEV`) that `console.warn`s if any `VITE_`-prefixed variable name contains
`service_role` or `secret`, and if `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` are only
partially set — a defense-in-depth catch for exactly this mistake, not a hard failure (the app's
existing `isSupabaseBackendEnabled()` soft-disable pattern is intentional and unchanged).

## 4. Production safeguards

- Distinct project ref from staging (section 2) — the single largest safeguard, since it makes a
  staging mistake structurally incapable of touching production data.
- Default-deny RLS on every exposed-schema table (already true — `12-rls-and-authorization-audit.md`,
  and now extended to `public.user_roles` in this same Base pass).
- No `service_role`/secret key ever reachable from browser code (section 3).
- Admin/owner access requires MFA (`aal2`) before the dashboard renders at all (Base Phase 3, this
  pass) — see `20-admin-mfa-recovery-ux.md`.
- Offboarding/compromise response procedures already documented in
  `16-first-owner-and-mfa-runbook.md` steps 13–14 (session revocation, not just `app_metadata`).
- Branch protection recommendation (not yet configured — GitHub repo setting, outside this repo's
  own files): require the `frontend` and `database` CI checks (section 7) to pass before merging to
  `main`.

## 5. Staging deployment checklist

To be run only once a dedicated staging Supabase project reference exists (section 6):

1. `supabase link --project-ref <staging-ref>` — links the CLI to staging, **never** production.
   Confirm with `supabase projects list` that the ref you just linked is actually the staging one,
   not a copy-paste of the production ref.
2. `supabase db diff --linked` (or `supabase migration list --linked`) to review exactly what would
   change **before** applying anything — never skip straight to `db push`.
3. `supabase db push --linked` to apply the reviewed migration set to staging.
4. Set the hosting platform's **Preview/staging** environment variables (section 3) to the staging
   project's URL/publishable key — verify this is configured per-environment in the host's UI, not a
   single value shared with Production.
5. Provision a staging-only admin/owner test account (`16-first-owner-and-mfa-runbook.md` steps 1–3)
   and enroll MFA on it (`20-admin-mfa-recovery-ux.md` section 1) — never reuse a real production
   admin's credentials against staging.
6. Run the full local validation suite (pgTAP, `tsc`, lint, build) already required for local, plus
   a manual smoke pass of the deployed staging URL: sign-in, MFA challenge, dashboard load, a test
   checkout.
7. Confirm frontend-to-staging connectivity **without privileged credentials** — the deployed
   frontend must only ever hold the publishable key, exactly as locally (section 3) — this is the
   literal Base exit criterion "frontend connects to staging without privileged credentials."

## 6. Staging rollback checklist

1. Before step 3 above, record the staging project's current `supabase migration list --linked`
   output (the last-known-good migration timestamp) somewhere outside the repository (an evidence
   file, a deploy log) — this is what you roll back *to*.
2. If a deployed migration causes a problem: prefer a new, forward-fixing migration (a `down`-style
   correction migration) over any destructive rollback — consistent with this project's own
   Git-safety posture (no rewriting history, no force operations) applied to the database too.
3. If data corruption (not just schema) occurred, restore from the staging project's own Supabase
   backup (Dashboard → Database → Backups) rather than attempting a manual data fix — staging backups
   exist specifically so this is low-stakes to use freely, unlike production.
4. Re-run the full staging deployment checklist (section 5) from step 2 after any rollback, to
   re-confirm the resulting state before resuming normal use.
5. Never run `supabase db reset --linked` against staging as a "quick fix" — that command is for the
   local/ephemeral tier only (section 2); running it against any hosted project destroys real data.

## 7. CI validation plan

Current state of `.github/workflows/verify.yml`, as of this pass:

- **`frontend` job** (lint, typecheck, build, generated-types-untouched check): already runs on every
  `pull_request`/`push` to `main`/`supabase`. Unchanged this pass.
- **`database` job** (local `supabase start` → `db reset` → `test db` → local-vs-committed
  `database.types.ts` diff): **re-enabled onto `pull_request`/`push` this pass.** It was previously
  `workflow_dispatch`-only because the migration baseline was incomplete at the time the job was
  written; the baseline is now complete and independently zero-diff-verified against the remote
  project (`supabase/migrations/README.md`), so the original gating reason no longer applies. Neither
  job requires `SUPABASE_ACCESS_TOKEN` or touches any remote project — both run entirely against a
  disposable local Postgres container.
- **Not yet in CI, and explicitly out of this Base pass's scope:** a staging-deploy job (blocked on
  the staging project not existing — section 6 below) and Playwright E2E in CI (named as a **Floor 7**
  responsibility — "CI enforcement of security and reliability gates" — in
  `00-commerce-os-phase-ownership.md`, not a Base exit criterion; also currently subject to the
  documented parallel-worker checkout flake, which would need to be resolved or made non-blocking
  before it could be a sane required CI check — see `50-checkout-flake-serial-workers-investigation.md`).

## 8. Consolidated staging blocker

No separate staging Supabase project reference exists. This section is the single place listing what
is needed to unblock sections 5–7 above.

**What the user must create:** a new, dedicated Supabase project to serve as staging — distinct from
`jguewximloxmbhpsoxjb` (which remains local-only/development-candidate per section 1).

**Where to create it:** the Supabase Dashboard (`https://supabase.com/dashboard`) → "New project" —
this is an account-level action requiring the user's own Supabase organization/billing context, which
this agent has no access to and should not attempt.

**Required safe values to return to this agent (safe to paste in chat):**
- The new project's **reference ID** (the short string in its dashboard URL, e.g.
  `abcdefghijklmnop` — same shape as `jguewximloxmbhpsoxjb`).
- Confirmation of which Supabase organization/plan it was created under (for context only, not a
  secret).

**Values that must never be pasted into chat or committed:**
- The project's `service_role`/secret key.
- The database password set during project creation.
- Any personal access token (`SUPABASE_ACCESS_TOKEN`) used to authenticate the CLI to it.

**Next commands this agent would run, once that project reference is provided and the user
explicitly approves proceeding:**
```bash
supabase link --project-ref <staging-ref>
supabase db diff --linked          # review only, no changes applied yet
supabase db push --linked          # only after explicit review/approval of the diff above
```
None of these are run by this document — they are the literal next step, deferred until the
project reference exists and the user authorizes the link/push explicitly (a remote, consequential
action requiring approval per this task's own safety rules, same as `16-first-owner-and-mfa-runbook.md`
step 1's treatment of creating the first Auth user).
