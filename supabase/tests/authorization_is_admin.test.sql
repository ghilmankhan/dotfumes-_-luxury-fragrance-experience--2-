-- Executable pgTAP tests for private.is_admin() and the app_metadata-based
-- authorization model. Run via `supabase test db` against a local Supabase
-- stack.
--
-- Uses the same fixture-insert-then-impersonate pattern as
-- foundation_profiles_rls.test.sql. Only ever run against a local/test
-- database, never the remote project.

begin;
select plan(8);

-- ── Local-database guard (fail closed) ──────────────────────────────────
-- See supabase/tests/foundation_profiles_rls.test.sql for the full rationale.
-- Not a pgTAP assertion (not counted in plan() above) — must actually halt
-- execution before the auth.users fixture inserts below.
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

-- Normal (non-admin) user
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'customer@test.local', 'not-a-real-hash',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

-- Approved admin user: role granted via app_metadata (server-authoritative claim)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'admin@test.local', 'not-a-real-hash',
  now(), '{"role":"admin"}'::jsonb, '{}'::jsonb, now(), now()
);

-- User attempting privilege escalation via user_metadata only (client-editable field)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '55555555-5555-5555-5555-555555555555',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'spoofer@test.local', 'not-a-real-hash',
  now(), '{}'::jsonb, '{"role":"admin"}'::jsonb, now(), now()
);

-- 1. Anonymous user fails private.is_admin()
set local role anon;
reset "request.jwt.claims";
select ok(
  not private.is_admin(),
  'anonymous (no JWT) fails private.is_admin()'
);

-- 2. Normal authenticated user fails private.is_admin()
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","app_metadata":{}}';
select ok(
  not private.is_admin(),
  'a normal authenticated user (no admin claim) fails private.is_admin()'
);

-- 3. Approved admin claim passes private.is_admin()
set local "request.jwt.claims" to
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","app_metadata":{"role":"admin"}}';
select ok(
  private.is_admin(),
  'a user with app_metadata.role = admin passes private.is_admin()'
);

-- 4. user_metadata cannot grant administrator access
set local "request.jwt.claims" to
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated","app_metadata":{},"user_metadata":{"role":"admin"}}';
select ok(
  not private.is_admin(),
  'user_metadata.role = admin does NOT pass private.is_admin() (only app_metadata is trusted)'
);

-- 5. A user cannot set their own app_metadata (proxy: no client-facing role
-- has any UPDATE grant on auth.users at all; app_metadata is exclusively
-- managed by the Auth service / service_role, never by anon or authenticated)
set local role postgres;
reset "request.jwt.claims";
select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'auth' and table_name = 'users'
      and grantee in ('anon', 'authenticated')
      and privilege_type = 'UPDATE'
  ),
  'neither anon nor authenticated holds any UPDATE grant on auth.users (app_metadata is not client-writable)'
);

-- 6. private.is_admin() is SECURITY INVOKER, not SECURITY DEFINER
select ok(
  not (select prosecdef from pg_proc where oid = 'private.is_admin'::regproc),
  'private.is_admin() is SECURITY INVOKER (safe to grant EXECUTE broadly)'
);

-- 7. EXECUTE is granted to anon (function is meant to be publicly callable/embeddable in RLS)
select ok(
  exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'private' and routine_name = 'is_admin'
      and grantee = 'anon' and privilege_type = 'EXECUTE'
  ),
  'anon holds EXECUTE on private.is_admin()'
);

-- 8. EXECUTE is granted to authenticated
select ok(
  exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'private' and routine_name = 'is_admin'
      and grantee = 'authenticated' and privilege_type = 'EXECUTE'
  ),
  'authenticated holds EXECUTE on private.is_admin()'
);

select * from finish();
rollback;
