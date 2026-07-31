# 08 — Migration Risks

## Risk 1 (highest): task premise vs. actual repo state — already resolved by prior work, but changes what "safe foundation" means

This task was framed around protecting an operational Google backend while carefully introducing
a Supabase foundation alongside it. **That framing no longer matches reality**: the Google backend
is gone, and the Supabase side already has more than "foundation" — it has a working `products`/
`orders`/`settings` schema, an active edge function, and an admin-auth model wired through
`app_metadata.role` + (reportedly) `private.is_admin()`. This is not a defect to fix; it's a fact
that changes the safe next step. Two consequences:

- Phase B of this task (as literally specified) asks me to create `public.profiles` and
  `public.user_roles` with a **six-role enum-style model** (`customer, support,
  inventory_manager, payment_reviewer, admin, owner`) as the authorization foundation. But the
  system already has a **working single-role admin check** (`app_metadata.role = 'admin'`) wired
  into live RLS policies and the deployed edge function. Building `user_roles` as a second,
  parallel authority without reconciling it against the existing `app_metadata`-based check would
  create two independent sources of truth for "is this user an admin" — a real risk of drift
  (e.g., a `user_roles` row says `admin` but `app_metadata.role` still says something else, or
  vice versa, and different RLS policies check different things). This needs a decision, not a
  silent implementation — see 09-foundation-decisions.md, decision 6 ("Staff role hierarchy").
- Since `products`/`orders`/`settings` are not empty scaffolding but live, in-use tables (5
  products, 2 settings rows), any foundation-schema work must be additive only and must not touch
  them — consistent with the task's own "no premature implementation" rule, just for a different
  reason than originally assumed (they're not missing, they're already shipped).

## Risk 2: no local Supabase project — schema exists only as remote migration history

`list_migrations` now shows **5** applied migrations (the original 3, plus
`add_profiles_foundation` and `revoke_anon_grants_on_profiles` from the prior pass), but there is
still no `supabase/config.toml` capable of a full `db pull`-verified local rebuild, and the
original 3 migrations' exact SQL is still not in version control. I do not have access to their
original SQL text (only the introspected end-state via `list_tables`/`execute_sql`), so
hand-writing migration files that claim to reproduce them would risk diverging from the real DDL.
This blocks a fully reproducible local baseline. **Correction (2026-07-31):** the previous claim
that "the Supabase CLI is not installed in this environment (`supabase --version` → command not
found)" is **CONTRADICTED** — `npx --yes supabase --version` succeeds (`2.111.0`, exit 0) in this
same environment. The real, corrected blocker is **authentication**, not absence: `npx supabase
projects list` fails with `LegacyPlatformAuthRequiredError` (no `SUPABASE_ACCESS_TOKEN`, no prior
`supabase login`), and `supabase login`'s browser OAuth flow cannot be completed non-interactively
by this agent. `docker` is also absent (`command not found`), which independently blocks
`supabase start`/`db reset` even if auth were resolved. See 10-foundation-verification.md and
14-local-rebuild-and-test-results.md for the full corrected status and exact remediation steps.
Options remain in 09-foundation-decisions.md, decision 8 (now updated).

## Risk 5 (new this pass): local migration file version does not match the applied remote version

The prior pass's second migration was applied remotely via `apply_migration` and is recorded in
`list_migrations` as version **`20260731174630`** (`revoke_anon_grants_on_profiles`). The local
file committed for it is named
`supabase/migrations/20260731174521_revoke_anon_grants_on_profiles.sql` — **a different
timestamp** (`...174521` vs the remote's `...174630`). Verified by direct comparison of
`mcp__supabase__list_migrations` output against `git ls-files supabase/migrations` this pass.
**Impact:** `supabase migration list` (once the CLI is authenticated and linked) will see this as
a **mismatch** between local and remote migration history — the local file's version does not
correspond to any remote entry, and the remote's `20260731174630` entry has no matching local
file. This does not affect the live database (the SQL already ran and is in effect), but it will
produce confusing/incorrect output from `migration list`, `db push` dry-runs, and any future
`db pull` reconciliation until the local filename is corrected to match the remote version.
**Severity: P1 (correctness, not security).**

**Correction (2026-07-31, Foundation Closure pass): FIXED.** This task's own Phase 5 Step 3
explicitly directs this exact rename, conditioned only on verifying the SQL content matches the
remotely applied migration. Re-verified this pass: `mcp__supabase__list_migrations` returned
`{"version":"20260731174630","name":"revoke_anon_grants_on_profiles"}` for the exact same name as
the local file, whose content (`revoke all on public.profiles from anon;`) was independently
re-read and matches the previously-verified live grant state (`profiles` has zero `anon` grants,
see 10-foundation-verification.md / 12-rls-and-authorization-audit.md). Since `supabase/` is not
yet under version control in this repository (confirmed via `git status`), this was a plain
filesystem rename, not a `git mv` — no commit exists for it yet. **No SQL was re-run remotely; no
migration was reapplied; nothing in the live database changed.** Rollback: rename the file back;
trivial, no data impact either direction.

## Risk 3: TS/Postgres enum mismatch on order/payment status

Documented in 03 and 07. Not introduced by this task, not fixed by this task (touching `orders`
is out of scope), but should be flagged so it isn't mistaken for a foundation-stage defect later.

## Risk 4: no admin user, thin test coverage, CI written but not committed/executed

- `auth.users` has 0 rows — no one can actually log into the admin dashboard yet in production.
- **Correction (2026-08-01, Foundation Evidence Reconciliation pass):** "No CI pipeline exists" is
  stale. `.github/workflows/verify.yml` now exists on disk (read directly this pass) with a
  `frontend` job (lint/build/type-drift check) and a `database` job (local-stack rebuild + pgTAP).
  It is **not tracked in git** (`git ls-files .github` returns nothing) and has therefore **never
  run in GitHub Actions** — a workflow file only executes once committed and pushed. See
  06-testing-and-ci-inventory.md for the full exists/tracked/executed breakdown. The `database` job
  is also, as originally written, a check that would fail on every run today (only 2 of 5
  migrations exist locally) — Phase 8 of the Foundation Evidence Reconciliation task requires this
  not be a required-and-known-failing check; see that pass's correction to `verify.yml` itself.
- Three pgTAP test files now exist (36 assertions total, corrected 2026-08-01 — added a same-value
  email-sync regression test — statically reviewed, **none executed** —
  same Docker/local-stack blocker as before). The one e2e test still mocks out all network calls,
  so it still provides zero coverage of the real backend integration, RLS behavior, or the edge
  function.

None of these block a *safe, additive* foundation step (new tables, new RLS, all behind `deny by
default`), but they do mean there's no automated safety net to catch mistakes in that work before
it reaches production, since this project has no staging environment and no CI gate.

## Net assessment

Nothing found in this survey makes foundation implementation *destructive* if scoped narrowly
(new `profiles` table, tied 1:1 to `auth.users`, RLS deny-by-default) — that part is genuinely
additive and low-risk. What *would* be destructive-by-ambiguity is implementing the `user_roles`
role-hierarchy table and its RLS as specified, without first resolving how it relates to the
already-live `app_metadata`/`private.is_admin()` authorization path. That single decision is the
gate for whether Phase B proceeds in full or in the reduced form described in the final report.
