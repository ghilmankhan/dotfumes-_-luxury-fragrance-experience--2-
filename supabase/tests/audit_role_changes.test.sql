-- Executable pgTAP tests for the audit boundary introduced in
-- 20260801183254_establish_audit_boundary.sql: audit.role_changes and the
-- public.list_role_change_audit_log() read wrapper, plus the additive
-- audit-insert behavior of public.grant_role()/revoke_role().
--
-- Uses the same fixture-insert-then-impersonate pattern as
-- authorization_roles.test.sql. Only ever run against a local/test
-- database, never the remote project.

begin;
select plan(16);

-- ── Local-database guard (fail closed) ──────────────────────────────────
do $$
begin
  if not exists (
    select 1 from public.settings where key = '__local_test_environment_marker'
  ) then
    raise exception 'LOCAL_TEST_GUARD: marker row from supabase/seed.sql not found — refusing to run '
      'a test file that inserts auth.users rows against a database that does not look like a '
      'freshly-seeded local Supabase stack. Run `supabase db reset` first.';
  end if;
end $$;

set local role postgres;

-- ── 1-2. Structural checks ────────────────────────────────────────────────
select has_table('audit', 'role_changes', 'audit.role_changes table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'audit.role_changes'::regclass),
  'RLS is enabled on audit.role_changes'
);

-- ── Fixtures ─────────────────────────────────────────────────────────────
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'audit-owner@test.local',  'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'audit-customer@test.local', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'audit-target@test.local', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.user_roles (user_id, role) values
  ('b0000000-0000-0000-0000-000000000001', 'owner');

-- ── 3. grant_role() writes exactly one audit row with correct fields ────
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{},"aal":"aal2"}';
select public.grant_role('b0000000-0000-0000-0000-000000000003', 'support');

set local role postgres;
reset "request.jwt.claims";
select is(
  (select count(*)::int from audit.role_changes
     where actor = 'b0000000-0000-0000-0000-000000000001'
       and action = 'grant'
       and target_user = 'b0000000-0000-0000-0000-000000000003'
       and role = 'support'),
  1,
  'grant_role() writes exactly one matching audit.role_changes row'
);

-- ── 4. revoke_role() writes exactly one audit row with correct fields ───
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{},"aal":"aal2"}';
select public.revoke_role('b0000000-0000-0000-0000-000000000003', 'support');

set local role postgres;
reset "request.jwt.claims";
select is(
  (select count(*)::int from audit.role_changes
     where actor = 'b0000000-0000-0000-0000-000000000001'
       and action = 'revoke'
       and target_user = 'b0000000-0000-0000-0000-000000000003'
       and role = 'support'),
  1,
  'revoke_role() writes exactly one matching audit.role_changes row'
);

-- ── 5. service_role bootstrap grant records a null actor + service flag ─
set local role service_role;
set local "request.jwt.claims" to '{"role":"service_role"}';
select public.grant_role('b0000000-0000-0000-0000-000000000002', 'owner');

set local role postgres;
reset "request.jwt.claims";
select is(
  (select count(*)::int from audit.role_changes
     where actor is null
       and action = 'grant'
       and target_user = 'b0000000-0000-0000-0000-000000000002'
       and role = 'owner'
       and (metadata ->> 'caller_is_service')::boolean = true),
  1,
  'service_role bootstrap grant is recorded with a null actor and caller_is_service=true'
);

-- ── 6-7. Anonymous access denial ─────────────────────────────────────────
-- Unlike public.user_roles (which grants anon table-level SELECT so
-- private.is_admin() can safely embed it in anon-facing RLS), audit has no
-- such use case, so anon holds no USAGE on the schema at all — a harder,
-- schema-level denial, not an RLS-filtered-to-zero-rows one.
set local role anon;
reset "request.jwt.claims";
select throws_like(
  $$select count(*)::int from audit.role_changes$$,
  '%permission denied for schema audit%',
  'anon cannot reach audit.role_changes at all (no schema USAGE grant, a harder block than RLS)'
);
select ok(
  not exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'list_role_change_audit_log'
      and grantee = 'anon' and privilege_type = 'EXECUTE'
  ),
  'anon holds no EXECUTE grant on public.list_role_change_audit_log()'
);

-- ── 8-9. Non-admin denial ────────────────────────────────────────────────
-- b0000000-...-002 is excluded here: it was bootstrapped as 'owner' in
-- test 5 above, so it is no longer a non-admin fixture. b0000000-...-003
-- (granted then revoked 'support' in tests 3-4) is a genuinely non-admin
-- user at this point and is also the *subject* of two of the audit rows —
-- confirming even a user reading about their own account is still denied.
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"b0000000-0000-0000-0000-000000000003","role":"authenticated","app_metadata":{}}';
select is(
  (select count(*)::int from audit.role_changes),
  0,
  'a non-admin authenticated user sees zero audit.role_changes rows, even ones about their own account'
);
select is(
  (select count(*)::int from public.list_role_change_audit_log()),
  0,
  'public.list_role_change_audit_log() returns zero rows for a non-admin (RLS-filtered, not an error)'
);

-- ── 10-11. Admin/owner can read the full log ─────────────────────────────
set local "request.jwt.claims" to
  '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{},"aal":"aal2"}';
select ok(
  (select count(*)::int from audit.role_changes) >= 3,
  'an owner (role_changes_select_admin policy) can see every audit.role_changes row'
);
select ok(
  (select count(*)::int from public.list_role_change_audit_log()) >= 3,
  'public.list_role_change_audit_log() returns the full log for an owner'
);

-- ── 10a-10b. Owner WITHOUT aal2 cannot read the log (direct-API bypass
-- check, Base security-closure pass
-- 20260801193503_enforce_aal2_on_privileged_access.sql: role_changes_select_admin
-- now requires private.is_admin_mfa(), not just private.is_admin()) ──────
set local "request.jwt.claims" to
  '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{}}';
select is(
  (select count(*)::int from audit.role_changes),
  0,
  'an owner at aal1 (no MFA) sees zero audit.role_changes rows despite holding the owner role'
);
select is(
  (select count(*)::int from public.list_role_change_audit_log()),
  0,
  'public.list_role_change_audit_log() returns zero rows for an owner at aal1 (RLS-filtered, not an error)'
);

-- ── 12-13. No client role can write or edit the audit log directly ──────
select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'audit' and table_name = 'role_changes'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ),
  'neither anon nor authenticated holds INSERT/UPDATE/DELETE on audit.role_changes — append-only by clients'
);
select throws_like(
  $$insert into audit.role_changes (action, target_user, role) values ('grant', 'b0000000-0000-0000-0000-000000000003', 'support')$$,
  '%permission denied%',
  'a direct client INSERT into audit.role_changes is rejected'
);

-- ── 14. audit schema is not exposed via the PostgREST API schema list ───
select ok(
  not exists (
    select 1 from unnest(string_to_array(current_setting('pgrst.db_schemas', true), ',')) as s(name)
    where trim(s.name) = 'audit'
  ),
  'audit is not in the PostgREST-exposed schema list (unreachable except via the admin-gated wrapper)'
);

select * from finish();
rollback;
