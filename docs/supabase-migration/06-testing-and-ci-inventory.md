# 06 — Testing and CI Inventory

## Verified

- One Playwright e2e spec: `tests/e2e/smoke.spec.ts`. Runs against a set of static routes
  (`/`, `/collection`, `/about`, `/product/bold-decision`, `/checkout`, `/order-confirmation`,
  `/shipping`, `/returns`, `/contact`, `/faq`, `/privacy`, `/terms`, `/journal`,
  `/sustainability`, `/careers`) — a route-smoke test, not a backend/RLS/auth integration test.
  It intercepts non-local `fetch` GETs and returns a stubbed `{products: [], settings: {...}}`
  response (`smoke.spec.ts:19-33`), meaning **it does not exercise the real Supabase backend at
  all** — network calls are mocked out.
- Test command: `npm run test:e2e` → `playwright test` (`package.json` scripts).
- `npm run lint` → `eslint . && tsc --noEmit` — combines lint and type-check in one script.
- No unit test framework (no Jest/Vitest in `package.json` devDependencies).
- No backend/database tests (no pgTAP, no `supabase/tests/`, no `supabase/` directory at all).
- No admin-flow test, no checkout-integration test (against a real or seeded backend), no RLS
  authorization test.
- **No CI workflows** — `find .github -type f` returned nothing. No automated pipeline runs lint,
  typecheck, tests, or build on push/PR currently.

## What "runs" vs. what "merely exists"

| Item | Exists | Verified to run in this session |
|---|---|---|
| `tests/e2e/smoke.spec.ts` | Yes | Not executed this session (would require a running dev server; out of scope for a docs-only survey pass — see 06 command log in the final report for what was actually executed) |
| `npm run lint` (`eslint` + `tsc --noEmit`) | Yes | Not executed this survey pass |
| `npm run build` | Yes | Not executed this survey pass |
| CI | No | N/A |
| DB/RLS tests | No | N/A |

Actual command execution (with results) is deferred to Phase B validation, per the task's own
structure — see the "Tests Executed" section of the final report for what was actually run and
its outcome.

## Correction pass (2026-07-31) — commands actually executed, plus a new CI-relevant finding

| Command | Result | Notes |
|---|---|---|
| `npm run lint` (`eslint . && tsc --noEmit`) | PASS, exit 0 | No output (clean) |
| `npx tsc --noEmit` | PASS, exit 0 | No output |
| `npm run build` | PASS, exit 0 | See finding below |
| `npx --yes supabase --version` | PASS, exit 0 | `2.111.0` — CLI available via npx, corrects 00/08's "not installed" claim |
| `npx --yes supabase projects list` | FAIL (expected) | `LegacyPlatformAuthRequiredError` — not authenticated |
| `docker --version` | FAIL | `command not found` |

**New finding — `npm run build` writes to files tracked in git.** Running the build this pass
regenerated `src/generated/{ai-skill-plan,healing-plan,refactor-map,resolvedSkills,safe-fixes,ux-report}.json`
via three chained pre-build scripts (`skill:compile`, `skill:compile-v2`, `self-heal`) before
`vite build` runs. These files were already showing as modified in `git status` before this build
ran (pre-existing, unrelated skill-compiler work-in-progress — not caused by this task), but the
build step re-writing them on every run is a real, now-directly-observed problem for any future CI
job: a naive `npm ci && npm run build` in CI would non-deterministically dirty the working tree,
so `git diff --exit-code` (the drift check Phase 14 asks for) would need to run *after* build, not
assume build is diff-free. Recorded as a concrete blocker input for 15-next-stage-readiness.md /
CI design, not fixed here (touching the skill-compiler tooling is outside this task's scope and
explicitly listed as unrelated work to preserve).

## Correction (2026-08-01, Foundation Evidence Reconciliation pass) — CI, seed, and test artifacts now exist

The claims above ("No CI workflows", "no backend/database tests", "no `supabase/tests/`, no
`supabase/` directory at all") were **true when originally written** but are now stale — a later
pass (Foundation Closure) added the files below. Read directly this pass (`Read` tool on each
path), not inferred from a prior report. Status columns are kept intentionally granular per this
task's own verification directive: "exists" is not "passing."

| Artifact | Exists | Tracked in git | Statically reviewed | Executed locally | Executed in GitHub Actions | Passing |
|---|---|---|---|---|---|---|
| `.github/workflows/verify.yml` | **Yes** | **No — untracked** (`git ls-files .github` returns nothing) | Yes, this pass | N/A (not a test) | **No — never triggered**, since the file has never been pushed/committed | N/A |
| `supabase/seed.sql` | **Yes** | **No — untracked** (`git ls-files supabase` returns nothing) | Yes, this pass | No — requires `supabase db reset` against a local stack, blocked (14-local-rebuild-and-test-results.md) | N/A | N/A |
| `supabase/tests/foundation_profiles_rls.test.sql` | **Yes** | No — untracked | Yes — `plan(20)` matches 20 actual assertions (corrected 2026-08-01, Foundation Correction pass: added a structural check that `authenticated` has no UPDATE grant on `updated_at`, and replaced the now-invalid "trigger overwrites client input" behavioral test — invalidated by that same grant revocation — with a `throws_ok` insufficient-privilege test plus a structural trigger-existence check; prior to that, corrected 2026-08-01: added a same-value email-sync regression test, the original 17-count file only exercised the changed-value branch) | **No** | **No** | **Not run — cannot be "passing" or "failing," only "written"** |
| `supabase/tests/authorization_is_admin.test.sql` | **Yes** | No — untracked | Yes — `plan(8)` matches 8 actual assertions | **No** | **No** | Not run |
| `supabase/tests/existing_tables_rls.test.sql` | **Yes** | No — untracked | Yes — `plan(10)` matches 10 actual assertions. **Fixture defect corrected 2026-08-01 (Foundation Correction pass):** the `orders` insert used a nonexistent `customer_phone` column (the real column is `phone`) and was missing the required, non-nullable `address` column entirely — verified against `src/lib/database.types.ts` and `03-data-model-inventory.md`. This file could not have executed successfully even once a local stack existed; it is now statically corrected but still unexecuted. | **No** | **No** | Not run |

Total: 3 pgTAP files, 38 assertions (20+8+10, corrected 2026-08-01, Foundation Correction pass — see
foundation_profiles_rls.test.sql row above), all statically reviewed, **none executed**, since no
local Docker stack exists in this environment (unchanged blocker, see
14-local-rebuild-and-test-results.md).

**The entire `supabase/`, `.github/`, and `docs/supabase-migration/` directories are untracked in
git** (`git status --short` this pass: all three show as `??`, not `M`). This means none of this
work — CI workflow included — currently exists from GitHub Actions' point of view if this branch
were pushed; a workflow file only runs once it is committed and present in the branch GitHub
Actions checks out. This is a materially different claim than "CI exists and runs"; the corrected
claim is **"a CI workflow file has been authored and would run once committed and pushed, but has
not yet been committed, pushed, or executed."**
