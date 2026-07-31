# 10 — Foundation Verification

Every claim below is checked against the actual file/SQL, not against the previous pass's report.
Evidence is inline; nothing here is copied from the prior report without independent re-verification.

## `supabase/migrations/20260731174520_add_profiles_foundation.sql`

Read in full this pass (`Read` tool). Content matches what was actually applied remotely, verified
by comparing against `pg_get_functiondef`/`pg_policies`/grant introspection (see
12-rls-and-authorization-audit.md for the full policy/grant tables). No discrepancy found between
the local file and the live database state for this migration.

| Claim | Status | Evidence |
|---|---|---|
| Creates `public.profiles(id uuid pk → auth.users, full_name, phone, email, created_at, updated_at)` | VERIFIED | `information_schema.columns` + `pg_constraint` (`profiles_id_fkey`, `ON DELETE CASCADE`, `ON UPDATE NO ACTION`) |
| RLS enabled on `profiles` | VERIFIED | `pg_class.relrowsecurity = true` for `profiles` |
| Exactly 2 policies (`profiles_select_own`, `profiles_update_own`), both `to authenticated`, ownership predicate `auth.uid() = id` | VERIFIED | `pg_policies` |
| UPDATE policy has both `USING` and `WITH CHECK` | VERIFIED | `pg_policies.qual` and `.with_check` both `(( SELECT auth.uid() AS uid) = id)` |
| `anon` has zero grants on `profiles` | VERIFIED | `information_schema.role_table_grants` — no `anon` row for `profiles` (fixed by the second migration, see below) |
| `authenticated` can UPDATE only `full_name`, `phone`, `updated_at` — **not** `id`/`email`/`created_at` | VERIFIED | `information_schema.column_privileges`: `authenticated` has `UPDATE` privilege rows only for `full_name`, `phone`, `updated_at`; `SELECT` on all 5 non-PK-adjacent columns |
| **Can a user directly write `updated_at`?** | **PARTIALLY TRUE — worth flagging precisely** | `authenticated` *does* hold column-level `UPDATE` grant on `updated_at` (confirmed above) — so at the **grant level**, a client could attempt to set it directly. However, `profiles_set_updated_at` is a `BEFORE UPDATE` trigger calling `private.set_updated_at()`, which unconditionally overwrites `new.updated_at = now()` regardless of what the client sent — so any client-supplied `updated_at` value is silently discarded before the row is written. **Net effect is correct** (client cannot actually control the stored value), but the *grant* is broader than necessary — a stricter implementation would `REVOKE UPDATE (updated_at) FROM authenticated` too, since the trigger already fully owns that column. Classified as a **Low-severity correctness/defense-in-depth gap**, not a live vulnerability (the trigger prevents actual exploitation). |
| `private.handle_new_user()` — auto-provisions one profile per new `auth.users` row | VERIFIED (structurally) | Trigger `on_auth_user_created` (`AFTER INSERT ON auth.users`) → `private.handle_new_user()`; function body does `insert into public.profiles (...) values (...) on conflict (id) do nothing;` — the `on conflict do nothing` guarantees **at most one** profile row per user even under a hypothetical retry/race, which also answers "duplicate profile behavior": impossible by construction. **Not tested live** (0 rows in `auth.users`, no real signup has occurred — cannot observe the trigger fire). |
| `private.sync_user_email()` — keeps `profiles.email` in sync | VERIFIED (structurally) | Trigger `on_auth_user_email_updated` (`AFTER UPDATE ON auth.users`) → function updates `profiles.email`/`updated_at` `if new.email is distinct from old.email`. Not tested live (no real email-change event exists to observe). |
| Both trigger functions: `SECURITY DEFINER`, fixed empty `search_path`, `RETURNS TRIGGER` | VERIFIED | `pg_get_functiondef` output, `security_definer: true`, `configuration: ["search_path=\"\""]`, `RETURNS trigger` for both — matches the documented mitigation pattern (not directly callable as an RPC even though `EXECUTE` is granted to `PUBLIC`, since a function returning `trigger` cannot be invoked outside a trigger context) |
| Existing-user backfill behavior | **VERIFIED: none exists, none needed** | `auth.users` has 0 rows (verified via `list_tables` this pass) — there are no pre-existing users to backfill profiles for. This will need re-checking the moment a real user is created outside the trigger path (there is none currently). |
| Risk of blocking Auth signup | **[Inference], not directly tested** | The trigger function has no exception handling — if `private.handle_new_user()` ever throws (e.g., a future `NOT NULL` column added to `profiles` without a default), Postgres will abort the `auth.users` INSERT transaction too, since `AFTER INSERT` triggers run in the same transaction as the row insert. This is standard Supabase trigger behavior, not a defect specific to this migration, but it is a real coupling: profile-table constraint changes can break signup. Not tested live (would require creating a real signup, disallowed). |

## `supabase/migrations/20260731174630_revoke_anon_grants_on_profiles.sql`

**Correction (2026-08-01, Foundation Evidence Reconciliation pass):** this section's own heading
previously read `20260731174521_...`, the pre-rename filename — stale, corrected here to the actual
current filename (verified via direct `Read` of `supabase/migrations/` this pass).

```sql
revoke all on public.profiles from anon;
```

| Claim | Status | Evidence |
|---|---|---|
| `anon` has zero table-level grants on `profiles` after this migration | VERIFIED | `information_schema.role_table_grants` — confirmed no `anon` rows for `profiles` |
| Reversibility | Trivial — `GRANT` the specific default privileges back if ever needed; no data loss risk either direction | — |
| **Local filename matches the remote applied migration version** | **FIXED** (was CONTRADICTED) | File renamed to `20260731174630_revoke_anon_grants_on_profiles.sql` in the Foundation Closure pass, matching `list_migrations`' recorded version exactly. Verified this pass by direct `ls`/`Read` of `supabase/migrations/`. Local filesystem rename only — `supabase/` is not tracked in git (`git ls-files supabase` returns nothing), so no commit exists for this rename yet, and zero SQL was re-run remotely. See 08-migration-risks.md, Risk 5. |

## `supabase/tests/*.test.sql` — 3 files, 36 assertions total

**Correction (2026-08-01, Foundation Artifact Preservation pass):** `foundation_profiles_rls.test.sql`
was revised from `plan(17)` to `plan(18)` — a same-value Auth-email-update regression test was added
(the `is distinct from` guard in `private.sync_user_email()` was previously only exercised on its
changed-value branch), and a fail-closed local-database guard (checking a marker row inserted by
`supabase/seed.sql`) was added to all three files, ahead of any fixture mutation. The guard is a
`do $$ ... raise exception ... $$` block, not a pgTAP assertion, so it is not counted in any file's
`plan()`.

**Correction (2026-08-01, Foundation Evidence Reconciliation pass):** this section previously
described a single test file with "5 structural pgTAP assertions." That was accurate for the state
at the time but is now stale — a later pass (Foundation Closure) rewrote that file and added two
more. Re-verified this pass by direct `Read` of all three files and manual count of `select`
assertion statements against each file's declared `plan(n)`:

| File | `plan(n)` | Assertions counted | Match | Content |
|---|---|---|---|---|
| `foundation_profiles_rls.test.sql` | 17 | 17 | Yes | 5 structural (table/RLS/policy-count/grant checks) + 12 behavioral (anon denial, own-row read, cross-user read/write denial, `id`/`email` column-grant denial via `throws_ok`, `updated_at` trigger override, email-sync trigger, cascade delete) |
| `authorization_is_admin.test.sql` | 8 | 8 | Yes | `private.is_admin()` behavior for anon/normal/admin/spoofed-`user_metadata` JWTs, no client UPDATE grant on `auth.users`, `SECURITY INVOKER` check, `EXECUTE` grant checks |
| `existing_tables_rls.test.sql` | 10 | 10 | Yes | `products`/`orders`/`settings`/storage RLS across anon/non-admin/admin |

**None of the three have ever been executed** — `pgtap` extension is present in the project's
extension catalog but shows `installed_version: null` (not installed) on the remote project
(verified via `list_extensions`), and no local Postgres instance exists in this environment
(`docker`: not found). See 14-local-rebuild-and-test-results.md for the full executable-testing
status. All 36 assertions are **statically reviewed and internally consistent** with what was
independently verified via raw SQL introspection above and in 12-rls-and-authorization-audit.md,
but "reviewed and never run" is not the same as "passing" — flagged explicitly so this distinction
isn't lost. One coverage gap noted this pass: the email-sync test only exercises the case where
`new.email` differs from `old.email`; it does not exercise the trigger's `is distinct from` guard
on a same-value update (i.e., nothing proves `updated_at` is left untouched when email is
"changed" to its current value) — a minor test-coverage gap, not a defect in the trigger itself.

## `src/lib/database.types.ts` / `src/lib/supabaseClient.ts`

- `database.types.ts`: read in full. Matches the live schema exactly for `orders`/`products`/
  `profiles`/`settings` tables and the `create_order` RPC signature — cross-checked field-by-field
  against `information_schema.columns` and the `create_order` function signature
  (`pg_get_function_identity_arguments`) this pass. No drift found.
- `supabaseClient.ts`: read in full. `createClient<Database>(...)` — correctly typed. No
  `service_role` key reference anywhere in `src/` (verified via `grep -ri "service_role" src/`
  returning zero commerce-code matches this pass — the only reference lives server-side in the
  `create-order` edge function, which reads it from `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`, a
  Supabase-managed edge-function secret, not a repo file).

## Item-by-item foundation-structure classification (Phase 13)

| Item | Classification | Evidence |
|---|---|---|
| `profiles` | **IMPLEMENTED** | See table above |
| `user_roles` | **DEFERRED BY APPROVED DECISION** | User selected "Skip user_roles for now" via `AskUserQuestion` in the prior session — see 09-foundation-decisions.md §6 |
| `private` schema | **IMPLEMENTED** (pre-existing, not created by this task) | `information_schema.schemata` confirms `private` exists; holds `is_admin`, `handle_new_user`, `sync_user_email`, `set_updated_at` |
| `audit` schema | **MISSING — unchanged** | `information_schema.schemata` — only `public`/`private` exist, no `audit`. No consumer exists yet; building it now would be premature scaffolding per this task's own "no premature implementation" principle. Not re-verified live this pass (would require `execute_sql`, out of scope for a docs-reconciliation pass) — carried forward from the last live introspection. |
| MFA helper | **MISSING — unchanged** | No `current_user_has_mfa()` or equivalent function was added by any migration file reviewed this pass (`add_profiles_foundation.sql`, `revoke_anon_grants_on_profiles.sql` — neither touches MFA). `auth.mfa_factors` status not re-queried live this pass; carried forward from the last live introspection (0 rows). |
| Seed strategy | **IMPLEMENTED (local-only), corrected 2026-08-01** | `supabase/seed.sql` now exists (`Read` this pass) — 4 fixture products, 1 settings row, both `on conflict ... do nothing` (idempotent/repeatable). **Untracked in git** (`git ls-files supabase` still returns nothing). Never applied — requires `supabase db reset` against a local stack, which remains blocked (no Docker). Deliberately creates no `auth.users` rows. |
| Generated TypeScript types | **IMPLEMENTED** | See above |
| Centralized client | **IMPLEMENTED** (pre-existing from `8f484cf`; typed via `SupabaseClient<Database>` — verified via `git diff -- src/lib/supabaseClient.ts` this pass, a real, currently-unstaged working-tree change) | `src/lib/supabaseClient.ts` |
| Database tests | **PARTIAL, corrected 2026-08-01** | 3 pgTAP files exist, 36 assertions total, all statically reviewed and internally consistent (see above), now with a fail-closed local-database guard — **none executed**. Untracked in git. |
| CI workflow | **IMPLEMENTED (file exists), NOT RUNNING, corrected 2026-08-01** | `.github/workflows/verify.yml` exists (`Read` this pass) with `frontend` and `database` jobs. **Untracked in git** — `git ls-files .github` returns nothing, so it has never actually run in GitHub Actions (a workflow only executes once committed and pushed). The `database` job would additionally fail today by design (only 2 of 5 migrations captured locally); see 08-migration-risks.md Risk 4 and the Phase 8 CI audit in 19-foundation-reconciliation.md for the correction applied to that job. |
