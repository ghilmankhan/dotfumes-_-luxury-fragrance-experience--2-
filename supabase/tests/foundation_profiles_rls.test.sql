-- Executable pgTAP tests for public.profiles: structure, RLS, grants, and
-- trigger behavior. Requires the pgTAP extension and a local Supabase stack
-- (`supabase start` + `supabase test db`). NOT EXECUTED as of this pass — no
-- Docker/local stack is available in this environment (see
-- docs/supabase-migration/14-local-rebuild-and-test-results.md). Written to
-- be run once that blocker is resolved; treat as design-verified, not
-- run-verified, until `supabase test db` output is captured.
--
-- Test users are inserted directly into `auth.users` inside this file's own
-- transaction, which is rolled back at the end — this is the standard pgTAP
-- pattern for RLS testing and is only ever run against a local/test database,
-- never against the remote project.

begin;
select plan(18);

-- ── Local-database guard (fail closed) ──────────────────────────────────
-- Added 2026-08-01 (Foundation Artifact Preservation pass). Not a pgTAP
-- assertion (deliberately not `select ok(...)`, and not counted in plan()
-- above) because a failed pgTAP assertion does not stop the rest of this
-- file from running — this must actually halt execution before any
-- auth.users mutation happens below. See supabase/seed.sql for the marker
-- row this checks and why it reliably indicates a local, seeded database
-- rather than depending on a database-name guess.
do $$
begin
  if not exists (
    select 1 from public.settings where key = '__local_test_environment_marker'
  ) then
    raise exception 'LOCAL_TEST_GUARD: marker row from supabase/seed.sql not found — refusing to run '
      'a test file that inserts/deletes auth.users rows against a database that does not look like '
      'a freshly-seeded local Supabase stack. Run `supabase db reset` first.';
  end if;
end $$;

-- ── Structural checks (no fixtures required) ────────────────────────────
select has_table('public', 'profiles', 'profiles table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on public.profiles'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'profiles'),
  2,
  'exactly two policies exist on public.profiles (select_own, update_own)'
);
select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'profiles' and grantee = 'anon'
  ),
  'anon has zero table-level grants on public.profiles'
);
select ok(
  not exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'profiles'
      and grantee = 'authenticated' and privilege_type = 'UPDATE'
      and column_name in ('id', 'email', 'created_at')
  ),
  'authenticated cannot UPDATE id, email, or created_at on public.profiles'
);

-- ── Fixtures: two auth users, inserted as postgres (bypasses RLS) ───────
set local role postgres;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'user-a@test.local', 'not-a-real-hash',
  now(), '{}'::jsonb, '{"full_name":"User A"}'::jsonb, now(), now()
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'user-b@test.local', 'not-a-real-hash',
  now(), '{}'::jsonb, '{"full_name":"User B"}'::jsonb, now(), now()
);

-- New Auth user receives exactly one profile (via on_auth_user_created trigger)
select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'inserting an auth.users row auto-provisions exactly one profiles row'
);
select is(
  (select count(*)::int from public.profiles),
  2,
  'exactly two profiles rows exist after inserting two auth users'
);

-- ── Anonymous access ─────────────────────────────────────────────────────
set local role anon;
reset "request.jwt.claims";
select is_empty(
  $$ select 1 from public.profiles $$,
  'anonymous user cannot read any row from public.profiles'
);

-- ── User A: read own row, cannot read User B's row ──────────────────────
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.profiles),
  1,
  'User A sees exactly one row via SELECT (RLS filters to own row only)'
);
select is(
  (select id from public.profiles limit 1),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'the one row User A can see is their own'
);

-- User A can update own allowed fields (full_name, phone)
update public.profiles set full_name = 'User A Updated' where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'User A Updated',
  'User A can update their own full_name'
);

-- User A cannot update User B's row (RLS WITH CHECK / USING blocks it — 0 rows affected, no error)
update public.profiles set full_name = 'Hijacked' where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222' and full_name = 'Hijacked'),
  0,
  'User A cannot update User B''s profile row'
);

-- User A cannot modify their own id (no column grant at all — must error)
select throws_ok(
  $$ update public.profiles set id = '99999999-9999-9999-9999-999999999999' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  'User A cannot modify their own profile id (insufficient_privilege)'
);

-- User A cannot directly modify email (no column grant at all — must error)
select throws_ok(
  $$ update public.profiles set email = 'attacker@evil.example' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  'User A cannot directly modify email (insufficient_privilege)'
);

-- User A cannot meaningfully control updated_at (grant exists, but trigger overrides it)
update public.profiles
set full_name = 'Trigger Check', updated_at = '2000-01-01T00:00:00Z'
where id = '11111111-1111-1111-1111-111111111111';
select ok(
  (select now() - updated_at < interval '1 minute' from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'client-supplied updated_at is overwritten by the private.set_updated_at trigger'
);

-- ── Auth email sync (as postgres, simulating an Auth-service-driven update) ─
set local role postgres;
reset "request.jwt.claims";
update auth.users set email = 'user-a-new@test.local' where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select email from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'user-a-new@test.local',
  'updating auth.users.email synchronizes public.profiles.email via private.sync_user_email'
);

-- ── Auth email sync: same-value update is a no-op (new — regression test for
-- the `is distinct from` guard in private.sync_user_email(), which the
-- previous version of this file never exercised) ───────────────────────────
create temporary table _guard_before_email_sync as
  select updated_at from public.profiles where id = '11111111-1111-1111-1111-111111111111';

update auth.users set email = 'user-a-new@test.local' where id = '11111111-1111-1111-1111-111111111111';

select is(
  (select updated_at from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  (select updated_at from _guard_before_email_sync),
  'setting auth.users.email to its own current (unchanged) value does not touch public.profiles.updated_at'
);

drop table _guard_before_email_sync;

-- ── Cascade delete ───────────────────────────────────────────────────────
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select is_empty(
  $$ select 1 from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  'deleting an auth.users row cascades to delete the matching public.profiles row'
);

select * from finish();
rollback;
