-- Executable pgTAP tests for the granular Base role model introduced in
-- 20260801175838_add_granular_authorization_roles.sql: public.user_roles,
-- private.has_role()/is_owner()/is_admin(), and the public.grant_role()/
-- public.revoke_role() controlled mutation RPCs.
--
-- Uses the same fixture-insert-then-impersonate pattern as
-- authorization_is_admin.test.sql and foundation_profiles_rls.test.sql. Only
-- ever run against a local/test database, never the remote project.

begin;
select plan(35);

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

-- ── Fixtures ─────────────────────────────────────────────────────────────
-- Each auth.users insert fires on_auth_user_created, which now assigns a
-- default 'customer' role via private.handle_new_user() (Section 4 of the
-- migration under test). Additional roles below are granted with a direct
-- INSERT (bypassing the RPCs) purely to set up fixtures quickly; the RPCs
-- themselves are exercised separately further down.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer-a@test.local', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer-b@test.local', 'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'support@test.local',    'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inventory@test.local',  'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reviewer@test.local',   'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local',      'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@test.local',      'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner2@test.local',     'x', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grant-target@test.local','x', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.user_roles (user_id, role) values
  ('a0000000-0000-0000-0000-000000000003', 'support'),
  ('a0000000-0000-0000-0000-000000000004', 'inventory_manager'),
  ('a0000000-0000-0000-0000-000000000005', 'payment_reviewer'),
  ('a0000000-0000-0000-0000-000000000006', 'admin'),
  ('a0000000-0000-0000-0000-000000000007', 'owner');

-- ── 1-2. Anonymous access denial ────────────────────────────────────────
set local role anon;
reset "request.jwt.claims";

select is(
  (select count(*)::int from public.user_roles),
  0,
  'anon sees zero user_roles rows despite a table-level SELECT grant (default-deny RLS)'
);
select ok(
  not exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'grant_role'
      and grantee = 'anon' and privilege_type = 'EXECUTE'
  ),
  'anon holds no EXECUTE grant on public.grant_role() at all'
);

-- ── 3. Customer isolation ───────────────────────────────────────────────
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{}}';

select is(
  (select count(*)::int from public.user_roles where user_id = 'a0000000-0000-0000-0000-000000000002'),
  0,
  'customer A cannot see customer B''s user_roles row (select-own RLS policy)'
);
select is(
  (select count(*)::int from public.user_roles where user_id = 'a0000000-0000-0000-0000-000000000001'),
  1,
  'customer A can see their own (auto-assigned) customer role row'
);

-- ── 4. Customer cannot grant a role ─────────────────────────────────────
select throws_like(
  $$select public.grant_role('a0000000-0000-0000-0000-000000000009', 'support')$$,
  'FORBIDDEN:%',
  'a plain customer cannot grant a role to someone else'
);

-- ── 5. Customer cannot self-escalate ────────────────────────────────────
select throws_like(
  $$select public.grant_role('a0000000-0000-0000-0000-000000000001', 'admin')$$,
  'SELF_ESCALATION_DENIED:%',
  'a user can never grant a role to themselves, even a customer trying to become admin'
);

-- ── 6-7. Support boundaries ──────────────────────────────────────────────
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated","app_metadata":{}}';
select ok(private.has_role('support'), 'support user passes private.has_role(support)');
select ok(not private.has_role('admin'), 'support user fails private.has_role(admin)');

-- ── 8-9. Inventory-manager boundaries ────────────────────────────────────
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000004","role":"authenticated","app_metadata":{}}';
select ok(private.has_role('inventory_manager'), 'inventory user passes private.has_role(inventory_manager)');
select ok(not private.has_role('payment_reviewer'), 'inventory user fails private.has_role(payment_reviewer)');

-- ── 10-11. Payment-reviewer boundaries ───────────────────────────────────
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated","app_metadata":{}}';
select ok(private.has_role('payment_reviewer'), 'reviewer user passes private.has_role(payment_reviewer)');
select ok(not private.has_role('support'), 'reviewer user fails private.has_role(support)');

-- ── 12. Admin grant/revoke limits: admin CAN grant a lower role ─────────
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated","app_metadata":{},"aal":"aal2"}';
select lives_ok(
  $$select public.grant_role('a0000000-0000-0000-0000-000000000009', 'support')$$,
  'admin (aal2) can grant the support role to another user'
);

-- ── 13. Admin grant/revoke limits: admin CANNOT grant admin/owner ───────
select throws_like(
  $$select public.grant_role('a0000000-0000-0000-0000-000000000009', 'admin')$$,
  'FORBIDDEN:%',
  'admin cannot grant the admin role — only an owner may'
);
select throws_like(
  $$select public.grant_role('a0000000-0000-0000-0000-000000000009', 'owner')$$,
  'FORBIDDEN:%',
  'admin cannot grant the owner role — only an owner may'
);

-- ── 14. MFA gating: admin WITHOUT aal2 is blocked ────────────────────────
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated","app_metadata":{}}';
select throws_like(
  $$select public.grant_role('a0000000-0000-0000-0000-000000000009', 'support')$$,
  'MFA_REQUIRED:%',
  'admin without an aal2 session cannot grant roles even though they are otherwise authorized'
);

-- ── 15-16. Owner authority: owner CAN grant admin and owner ──────────────
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000007","role":"authenticated","app_metadata":{},"aal":"aal2"}';
select lives_ok(
  $$select public.grant_role('a0000000-0000-0000-0000-000000000009', 'admin')$$,
  'owner (aal2) can grant the admin role'
);
select lives_ok(
  $$select public.grant_role('a0000000-0000-0000-0000-000000000008', 'owner')$$,
  'owner (aal2) can grant the owner role to a second user'
);

-- ── 17. Duplicate-role prevention ────────────────────────────────────────
select lives_ok(
  $$select public.grant_role('a0000000-0000-0000-0000-000000000009', 'support')$$,
  're-granting an already-held role does not raise (idempotent no-op)'
);
set local role postgres;
reset "request.jwt.claims";
select is(
  (select count(*)::int from public.user_roles
     where user_id = 'a0000000-0000-0000-0000-000000000009' and role = 'support'),
  1,
  'duplicate grant of the same role did not create a second row'
);

-- ── 18-19. Final-owner protection ────────────────────────────────────────
-- At this point owner_user (…07) and owner_user2 (…08) both hold 'owner'.
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000007","role":"authenticated","app_metadata":{},"aal":"aal2"}';
select lives_ok(
  $$select public.revoke_role('a0000000-0000-0000-0000-000000000008', 'owner')$$,
  'revoking one of two owners succeeds (one owner remains)'
);
select throws_like(
  $$select public.revoke_role('a0000000-0000-0000-0000-000000000007', 'owner')$$,
  'LAST_OWNER_PROTECTED:%',
  'revoking the sole remaining owner is blocked'
);

-- ── 20. Final-owner protection applies even to service_role ─────────────
set local role service_role;
set local "request.jwt.claims" to '{"role":"service_role"}';
select throws_like(
  $$select public.revoke_role('a0000000-0000-0000-0000-000000000007', 'owner')$$,
  'LAST_OWNER_PROTECTED:%',
  'the last-owner invariant is enforced unconditionally, even for service_role'
);

-- ── 21. Service-role bootstrap compatibility ─────────────────────────────
select lives_ok(
  $$select public.grant_role('a0000000-0000-0000-0000-000000000002', 'owner')$$,
  'service_role can grant a role (e.g. bootstrap the first owner) without an admin/owner caller or aal2'
);

-- ── 22-24. Helper-function correctness ───────────────────────────────────
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated","app_metadata":{}}';
select ok(
  private.is_admin(),
  'private.is_admin() is true for a user_roles admin row, with no app_metadata claim at all (new path)'
);
select ok(
  not private.is_owner(),
  'an admin (not owner) fails private.is_owner()'
);
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{}}';
select ok(
  private.is_owner(),
  'the service_role-bootstrapped user passes private.is_owner()'
);

-- ── 25-27. RLS enforcement under actual authenticated claims ────────────
-- Base security-closure pass (20260801193503_enforce_aal2_on_privileged_access.sql):
-- user_roles_select_admin now requires private.is_admin_mfa() (admin AND
-- aal2), not just private.is_admin(), since cross-user role visibility is
-- part of the same privileged role-management surface as grant_role()/
-- revoke_role(). Test 25 requires aal2; test 26 is the paired direct-API
-- bypass check proving an aal1 admin session is restricted to the same
-- select-own visibility as any other authenticated user.
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated","app_metadata":{},"aal":"aal2"}';
select ok(
  (select count(*)::int from public.user_roles) > 5,
  'an admin with an aal2 session (user_roles_select_admin policy) can see every user_roles row'
);
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000006","role":"authenticated","app_metadata":{}}';
select is(
  (select count(*)::int from public.user_roles),
  2,
  'an admin at aal1 (no MFA) sees only their own two user_roles rows (auto-assigned customer + granted admin), not every user''s (direct-API bypass check)'
);
set local "request.jwt.claims" to
  '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated","app_metadata":{}}';
select is(
  (select count(*)::int from public.user_roles where user_id <> 'a0000000-0000-0000-0000-000000000003'),
  0,
  'a non-admin support user still only sees their own row, never another user''s'
);

-- ── 27. get_my_roles() only ever returns the caller's own roles ─────────
select is(
  (select array_agg(r order by r) from public.get_my_roles() as r),
  array['customer', 'support']::public.app_role[],
  'get_my_roles() for the support user returns exactly {customer, support} (default + granted)'
);

-- ── 28. private.has_role() is SECURITY INVOKER ───────────────────────────
select ok(
  not (select prosecdef from pg_proc where oid = 'private.has_role(public.app_role)'::regprocedure),
  'private.has_role() is SECURITY INVOKER (safe to grant EXECUTE broadly)'
);

-- ── 29. grant_role()/revoke_role() are SECURITY DEFINER ──────────────────
select ok(
  (select prosecdef from pg_proc where oid = 'public.grant_role(uuid, public.app_role)'::regprocedure)
  and (select prosecdef from pg_proc where oid = 'public.revoke_role(uuid, public.app_role)'::regprocedure),
  'public.grant_role()/revoke_role() are SECURITY DEFINER (required to write rows the caller does not own)'
);

-- ── 30. private.has_aal2()/private.is_admin_mfa() are SECURITY INVOKER ──
select ok(
  not (select prosecdef from pg_proc where oid = 'private.has_aal2()'::regprocedure)
  and not (select prosecdef from pg_proc where oid = 'private.is_admin_mfa()'::regprocedure),
  'private.has_aal2()/is_admin_mfa() are SECURITY INVOKER (safe to grant EXECUTE broadly, and RLS remains the only source of truth)'
);

-- ── 31. revoke_role() takes an advisory lock before the final-owner count
-- (concurrency-safety proof for the count-then-delete invariant) ─────────
select ok(
  pg_get_functiondef('public.revoke_role(uuid, public.app_role)'::regprocedure) like '%pg_advisory_xact_lock%',
  'revoke_role() serializes owner-targeting calls with pg_advisory_xact_lock before counting remaining owners'
);

select * from finish();
rollback;
