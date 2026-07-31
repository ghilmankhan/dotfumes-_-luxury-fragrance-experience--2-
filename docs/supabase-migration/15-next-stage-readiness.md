# 15 — Next-Stage Readiness

**[Historical, superseded]** Everything from here through "Overall readiness for Floor 1... —
historical" below describes state as of the Foundation Closure pass and is kept for record only.
The workflow this section calls "proposed, not applied" was subsequently written to
`.github/workflows/verify.yml`. See the "Correction (2026-08-01...)" section near the end of this
file for the current, accurate status.

## CI foundation (Phase 14) — historical

**Status: BLOCKED from being added safely without a design decision from the user first.**

Reasoning: `npm run build` was verified this pass to write to six files tracked in git
(`src/generated/*.json`, via chained `skill:compile`/`skill:compile-v2`/`self-heal` pre-build
scripts — see 06-testing-and-ci-inventory.md). A naive PR-validation workflow doing
`npm ci && npm run build` would therefore always show a dirty tree afterward, making a
`git diff --exit-code` drift-check step either **fail on every PR** (if placed after build, since
build itself causes drift unrelated to the PR's actual change) or **be meaningless** (if placed
before build, since it wouldn't catch the intended risk — a contributor's change accidentally
altering committed generated output beyond what the build step itself already does). This is a
real, verified conflict between the task's own CI requirements ("verify generated database types",
"git diff --exit-code for generated artifacts") and this repository's existing, unrelated
build-tooling behavior. Resolving it requires a decision this task should not make unilaterally:
should CI diff-check *only* `src/lib/database.types.ts` (the Supabase-specific generated file this
task cares about) while explicitly excluding `src/generated/*.json` (owned by the separate
skill-compiler thread) from the drift check? That is the only path that satisfies this task's CI
requirement without colliding with unrelated, pre-existing repo behavior — but scoping the
exclusion correctly is a decision, not a mechanical action.

**Proposed workflow (not committed — provided here as the documented follow-up per Phase 14's own
instruction to do so if CI can't be safely added now):**

```yaml
# .github/workflows/pr-validation.yml (PROPOSED, NOT APPLIED)
name: PR Validation
on: pull_request
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      # Scoped to avoid the skill-compiler generated-file drift problem above —
      # only fails if THIS task's generated type file is stale relative to committed source.
      - run: git diff --exit-code -- src/lib/database.types.ts
      # Local Supabase stack + pgTAP: requires Docker on the runner (available on
      # ubuntu-latest by default) AND the Supabase CLI authenticated via a repo secret
      # (SUPABASE_ACCESS_TOKEN) for `supabase link`/`db pull` to backfill the 3 missing
      # original migrations — neither exists yet; this step is why the workflow above
      # is proposed, not applied.
      # - run: npx supabase db pull --project-ref jguewximloxmbhpsoxjb  # needs SUPABASE_ACCESS_TOKEN secret
      # - run: npx supabase start
      # - run: npx supabase db reset
      # - run: npx supabase test db
```

No production-deployment step and no remote-migration-push step are included, per the explicit
"do not add production deployment / do not add remote migration deployment" instruction. The
commented-out Supabase steps require a `SUPABASE_ACCESS_TOKEN` repo secret that does not currently
exist — adding it is a user action (GitHub repo settings), not something this agent can do.

## Floor 1 readiness — direct answers

| Question | Answer |
|---|---|
| Is the remote environment classified? | **No — UNKNOWN** (13-environment-classification.md) |
| Is the schema reproducible locally? | **No — PARTIAL** (14-local-rebuild-and-test-results.md); CLI works via npx but is unauthenticated, and no Docker exists in this environment |
| Have the original migrations been captured? | **No** — only the 2 new ones from the prior pass are captured as files (one with a version-number mismatch against remote, see 08 Risk 5); the original 3 are still remote-only |
| Has `create-order` been audited? | **Yes** (11-edge-function-audit.md) — 2 P1, 3 P2/informational findings, 0 P0 |
| Have existing RLS policies been audited? | **Yes** (12-rls-and-authorization-audit.md) — full policy table, one notable gap found (no customer order-read policy) |
| Has `private.is_admin()` been audited? | **Yes** (12) — SECURITY INVOKER, fixed search_path, single consistent source of truth, no drift |
| Do database tests execute? | **No** — pgTAP file exists, has never run (no local stack, `pgtap` extension not installed remotely) |
| Does CI exist? | **No** — proposed workflow documented above, not applied |
| Is the authorization source of truth approved? | **Yes, implicitly** — single verified authority (`app_metadata.role` via `private.is_admin()`), no competing authority exists, and the decision to *not* build a second one (`user_roles`) now was explicitly approved by the user (09-foundation-decisions.md §6) |
| Is guest order ownership approved? | **No — still Open**, and now documented with real consequences rather than "security impact: none" (09-foundation-decisions.md §1) |
| Is a staging environment available? | **[Unverified] / effectively no** — only one project ref (`jguewximloxmbhpsoxjb`) is referenced anywhere in this repository or its history; no second project, no staging config found |

## Overall readiness for Floor 1 (Product Catalog and Inventory) — historical, as of the Foundation Closure pass

**Not ready**, on the strength of two independent gates, either one of which is sufficient to hold:
1. Environment classification is UNKNOWN — building real inventory/catalog schema against an
   unclassified project risks doing real work against production without knowing it.
2. Two P1 findings in the live `create-order` function (no idempotency, no rate limiting) sit
   directly upstream of any inventory/stock work Floor 1 would add — building more stock-dependent
   logic on top of a duplicate-order-prone endpoint compounds the defect rather than isolating it.

Neither gate requires new code to close — both require decisions/actions external to this
repository (user confirms environment classification; user decides whether the P1 edge-function
findings get fixed before or alongside Floor 1). This task stops here per its own stop condition.

---

## Correction (2026-08-01, Foundation Evidence Reconciliation pass) — rewritten to match actual current state

Everything above this line reflects state as of the prior (Foundation Closure) pass and is kept for
history, not deleted. Several of its claims are now stale. This section is the current source of
truth for Floor 1 readiness.

### What changed since the text above was written

- **CI now exists as a file** (`.github/workflows/verify.yml`) — the "Proposed workflow (not
  committed)" language above is stale; the workflow is no longer merely proposed, it has been
  authored. It is, however, still **untracked in git** and has **never run in GitHub Actions** — see
  06-testing-and-ci-inventory.md's correction section for the full exists/tracked/executed
  breakdown. Its `database` job was also corrected this pass so it is no longer a required check
  that fails by design (see 19-foundation-reconciliation.md, Phase 8 entry).
- **Database tests are no longer "just a structural pgTAP file that never ran."** Three files, 35
  assertions, statically reviewed, **still never executed** (same Docker blocker).
- **Environment classification is no longer UNKNOWN.** Direct evidence (Vercel Deployments API, DNS
  lookup, bundled-JS inspection — see 13-environment-classification.md) rules out Production and
  rules out this project currently serving live Staging traffic. It is not, however, "Development —
  User Confirmed" either: the user has not yet confirmed this classification. Correct current label:
  **Development Candidate — Awaiting User Confirmation.**
- **The two P1 `create-order` findings now have written designs** (17-order-idempotency-design.md,
  18-create-order-abuse-controls.md, both hardened further in this pass per Phase 6/7 of the
  Foundation Evidence Reconciliation task) — **neither is implemented or approved.** The underlying
  P1s are unchanged in the deployed system.
- **Guest ownership has a reconciled recommendation** (Option B, anonymous Auth) but remains **Open,
  not approved** — see 09-foundation-decisions.md.

### Floor 1 readiness — corrected direct answers

| Question | Answer |
|---|---|
| Is the remote environment classified? | **Partially — "Development Candidate," not user-confirmed** (13-environment-classification.md) |
| Is the schema reproducible locally? | **No — still PARTIAL** (14-local-rebuild-and-test-results.md); CLI works via npx but is unauthenticated, no Docker in this environment, and the original 3 migrations are still uncaptured locally |
| Have the original migrations been captured? | **No** — only the 2 profiles-related migrations exist as local files, correctly named as of the Foundation Closure pass (`20260731174520_...`, `20260731174630_...`); the original 3 are still remote-only. Neither is tracked in git. |
| Has `create-order` been audited? | **Yes** (11-edge-function-audit.md) — 2 P1, 3 P2/informational findings, 0 P0. Deployed behavior unchanged. |
| Have existing RLS policies been audited? | **Yes** (12-rls-and-authorization-audit.md) |
| Has `private.is_admin()` been audited? | **Yes** (12) |
| Do database tests execute? | **No** — 3 pgTAP files exist (38 assertions, corrected 2026-08-01, Foundation Correction pass), statically reviewed, never run (no local stack) |
| Does CI exist? | **As a file, yes; as a running pipeline, no.** Untracked in git, never triggered. The `database` job is no longer configured as an always-failing required check (corrected this pass). |
| Is the authorization source of truth approved? | **Yes** — single verified authority (`app_metadata.role` via `private.is_admin()`), `user_roles` explicitly deferred by user decision |
| Is guest order ownership approved? | **No — Open.** Preferred candidate Option B (anonymous Auth) recommended, not approved; anonymous sign-ins not enabled. |
| Is idempotency design approved? | **No — Open.** Design hardened this pass (private schema, atomic CAS, single-transaction preference, rollout sequence) but not implemented or approved. |
| Is abuse-control design approved? | **No — Open.** Design hardened this pass (atomic limiter, HMAC'd identifiers, layered anti-targeting controls) but not implemented or approved. |
| Is a staging environment available? | **[Unverified] / effectively no** — unchanged, only one project ref found anywhere in this repository |

### Overall readiness for Floor 1 (Product Catalog and Inventory) — current

**Still not ready.** The two original gates are narrower but not closed:
1. Environment classification has moved from Unknown to Development Candidate, but remains
   unconfirmed by the user — the same "do not risk unclassified production work" caution still
   applies until confirmed.
2. The two P1 `create-order` findings are unchanged in the deployed system; hardened designs exist
   but neither is approved or implemented.

New gates surfaced by this reconciliation pass, not previously stated this precisely:
3. **Nothing in `supabase/`, `.github/`, or `docs/supabase-migration/` is tracked in git.** A
   session interruption, branch switch, or `git clean` could silently discard all foundation work to
   date — this is an operational risk independent of Floor 1 readiness but worth surfacing before
   any further work is layered on top of these untracked files.
4. Guest-ownership, idempotency, and abuse-control designs are now internally consistent and
   hardened, but **all three remain business/product decisions awaiting the user's explicit
   approval**, not implementation gaps this repository can close unilaterally.

This task stops here per its own stop condition — see 19-foundation-reconciliation.md for the full
contradiction matrix and file-by-file correction list.

---

## Correction (2026-08-01, Foundation Correction Commit and Local-Execution Preparation pass)

Everything above this line reflects state as of the Foundation Evidence Reconciliation pass. Since
then, the following changed (all covered in more detail in 08-migration-risks.md and the two hardened
design documents):

- **The foundation work described above as "untracked in git" is now committed** (two commits,
  `3d63fdf` and `42df0bc`, from the Foundation Artifact Preservation pass) — but still **not pushed**.
  Operational risk #3 from the prior correction section (uncommitted work vulnerable to accidental
  loss) is closed for what was committed in those two commits; this pass adds a third, later local
  commit for the corrections described below, also not pushed.
- **A real fixture defect was found and fixed** in `existing_tables_rls.test.sql` (wrong column name,
  missing required column — see 08-migration-risks.md) — this file could not have passed even once
  the local-execution blocker is resolved, until this correction.
- **A real over-broad grant was found and a corrective (not-yet-applied) migration was authored** for
  `public.profiles.updated_at` (see 08-migration-risks.md, Risk 6).
- **The idempotency and abuse-control designs were hardened further** — request-hash immutability,
  attempt-ownership guards, corrected error-code mapping, and (for abuse control) a server-controlled
  policy-table configuration model replacing caller-suppliable limits/windows. Both remain **Design
  Corrected — Not Implemented — Awaiting Approval**; neither status has changed to approved or
  implemented.
- **CI was corrected**: the Supabase CLI version is now pinned (was `latest`); the frontend job's
  type-check step was renamed to accurately describe what it proves (that the committed types weren't
  modified by the build, not that they match the live schema); the manual `database` job now also
  generates types from the locally-rebuilt database and diffs them against the committed file — this
  is the actual schema-vs-committed-types comparison, and it only runs via `workflow_dispatch`, same
  gating as before.

None of this changes the fundamental Floor 1 gates below — the environment classification is still
unconfirmed, the original 3 migrations are still uncaptured, no test (old or new) has executed, and
Docker/CLI-authentication remain unavailable in this environment.

### Floor 1 readiness — corrected direct answers, 2026-08-01 (Foundation Correction Commit pass)

| Question | Answer |
|---|---|
| Is the remote environment classified? | **Still partially — "Development Candidate," not user-confirmed** — unchanged |
| Is the schema reproducible locally? | **No — still PARTIAL** — unchanged; the migration-history README's claim about what `db pull` would prove has been corrected (it was overstated — see 08-migration-risks.md Risk 7), but the underlying gap (3 migrations uncaptured) is unchanged |
| Have the original migrations been captured? | **No** — unchanged. Three local migration files now exist (the two profiles-related ones, plus the new not-yet-applied `restrict_profile_updated_at_grant` migration), all correctly tracked in git as of this pass; the original 3 remain remote-only |
| Do database tests execute? | **No** — 38 assertions now (up from 36), statically reviewed, never run |
| Does CI exist? | **As a file, and now committed to git** — but still never triggered in GitHub Actions (would require a push, not performed this pass) |
| Is guest order ownership approved? | **No — Open** — unchanged |
| Is idempotency design approved? | **No — Open.** Hardened further this pass (attempt ownership, hash immutability, error mapping) — still not approved or implemented |
| Is abuse-control design approved? | **No — Open.** Hardened further this pass (policy-table configuration) — still not approved or implemented |
| Is a staging environment available? | **[Unverified] / effectively no** — unchanged |

### Overall readiness for Floor 1 — current, 2026-08-01 (Foundation Correction Commit pass)

**Still not ready.** The same two fundamental gates from the prior correction section remain open
(environment classification unconfirmed; the two P1 `create-order` findings still unimplemented in
the deployed system, designs now hardened twice over but neither approved). The third gate from that
section (uncommitted work) is now closed for the two prior commits, but this pass's own corrections
are a new round of local-only changes not yet committed at the time this document was written — see
the final report for this pass for the actual commit hashes once created.
