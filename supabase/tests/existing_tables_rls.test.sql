-- Executable pgTAP tests for the existing public.products, public.orders,
-- public.settings, and storage.objects (payment-slips bucket) RLS policies.
-- Run via `supabase test db` against a local Supabase stack
-- (`supabase start` + `supabase db reset --local`).
--
-- Corrected 2026-08-01 (Foundation validation-gate correction pass): tests 2
-- and 3 previously expected a 42501 permission error for anon/non-admin
-- UPDATEs on products. That is not what Postgres does here — anon and
-- authenticated both hold table-level UPDATE via `grant all on table
-- products to ...` (see 20260730185111_baseline_remote_schema.sql), so RLS,
-- not the privilege system, is the enforcement point; with no UPDATE policy
-- matching a non-admin role, the statement succeeds but affects zero rows.
-- Both assertions now check that the row is unchanged instead.
--
-- Corrected 2026-08-02 (Base security-closure pass,
-- 20260801193503_enforce_aal2_on_privileged_access.sql): every admin-gated
-- policy here now requires private.is_admin_mfa() (admin AND aal2), not
-- just private.is_admin(). Every "admin can X" assertion below now sets
-- `"aal":"aal2"` on the admin fixture's claims, and each has a paired
-- "admin at aal1 cannot X" assertion proving the server-side RLS itself
-- blocks a privileged session that has not completed MFA — not merely the
-- AdminPage frontend gate, which a direct REST/RPC call would bypass.
--
-- Fixtures (products/settings/orders/storage rows, one admin auth user) are
-- inserted as `postgres` (bypasses RLS) inside this file's own transaction,
-- which is rolled back at the end. Only ever run against a local/test
-- database, never the remote project.

begin;
select plan(19);

-- ── Local-database guard (fail closed) ──────────────────────────────────
-- See supabase/tests/foundation_profiles_rls.test.sql for the full rationale.
-- Not a pgTAP assertion (not counted in plan() above) — must actually halt
-- execution before the auth.users/products/orders fixture inserts below.
do $$
begin
  if not exists (
    select 1 from public.settings where key = '__local_test_environment_marker'
  ) then
    raise exception 'LOCAL_TEST_GUARD: marker row from supabase/seed.sql not found — refusing to run '
      'a test file that inserts fixture rows against a database that does not look like a '
      'freshly-seeded local Supabase stack. Run `supabase db reset` first.';
  end if;
end $$;

set local role postgres;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '66666666-6666-6666-6666-666666666666',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'staff-admin@test.local', 'not-a-real-hash',
  now(), '{"role":"admin"}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.products (slug, name, price, stock, active, category)
values
  ('test-active-scent', 'Test Active Scent', 10.00, 5, true, 'Unisex'),
  ('test-inactive-scent', 'Test Inactive Scent', 10.00, 5, false, 'Unisex');

insert into public.settings (key, value, is_public)
values
  ('test-public-setting', '{"note":"visible"}'::jsonb, true),
  ('test-private-setting', '{"note":"hidden"}'::jsonb, false);

insert into public.orders (
  order_code, customer_name, phone, address, items, subtotal, delivery_fee, total,
  payment_method, order_status, payment_status
) values (
  'TEST-0001', 'Test Customer', '923000000000', '123 Test Street', '[]'::jsonb, 10.00, 0.00, 10.00,
  'bank-transfer', 'new', 'pending'
);

insert into storage.objects (bucket_id, name, owner)
values ('payment-slips', 'test-order-id/slip.png', null);

-- ── Products ─────────────────────────────────────────────────────────────
set local role anon;
reset "request.jwt.claims";

-- 1. Public can read only active products
select is(
  (select count(*)::int from public.products where slug in ('test-active-scent', 'test-inactive-scent')),
  1,
  'anon can see only the active test product, not the inactive one'
);

-- 2. Public cannot modify products (table-level UPDATE grant exists; RLS has
-- no matching policy for anon, so the statement succeeds but touches 0 rows)
update public.products set price = 0.01 where slug = 'test-active-scent';
select is(
  (select price from public.products where slug = 'test-active-scent'),
  10.00,
  'anon cannot update products (RLS filters to zero matching rows; price unchanged)'
);

-- 3. Non-admin authenticated user cannot modify products (same reasoning:
-- table-level grant exists, RLS has no matching UPDATE policy for a
-- non-admin claim)
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{}}';
update public.products set price = 0.01 where slug = 'test-active-scent';
select is(
  (select price from public.products where slug = 'test-active-scent'),
  10.00,
  'a non-admin authenticated user cannot update products (RLS filters to zero matching rows; price unchanged)'
);

-- 4. Admin at aal2 can modify products
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}';
update public.products set price = 12.34 where slug = 'test-active-scent';
select is(
  (select price from public.products where slug = 'test-active-scent'),
  12.34,
  'an admin user with an aal2 session can update products'
);

-- 5. Admin WITHOUT aal2 cannot modify products (direct-API bypass check:
-- the server-side RLS itself blocks this, not merely the AdminPage
-- frontend's own aal2 gate)
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"}}';
update public.products set price = 99.99 where slug = 'test-active-scent';
select is(
  (select price from public.products where slug = 'test-active-scent'),
  12.34,
  'an admin at aal1 (no MFA) cannot update products (RLS filters to zero matching rows; price unchanged)'
);

-- ── Orders ───────────────────────────────────────────────────────────────
set local role anon;
reset "request.jwt.claims";

-- 6. Public cannot read orders
select is_empty(
  $$ select 1 from public.orders $$,
  'anon cannot read any row from public.orders'
);

-- 7. Non-admin authenticated user cannot read orders
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{}}';
select is_empty(
  $$ select 1 from public.orders $$,
  'a non-admin authenticated user cannot read any row from public.orders'
);

-- 8. Admin at aal2 can read orders
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}';
select isnt_empty(
  $$ select 1 from public.orders where order_code = 'TEST-0001' $$,
  'an admin user with an aal2 session can read orders'
);

-- 9. Admin WITHOUT aal2 cannot read orders
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"}}';
select is_empty(
  $$ select 1 from public.orders where order_code = 'TEST-0001' $$,
  'an admin at aal1 (no MFA) cannot read any row from public.orders'
);

-- 10. Admin at aal2 can update orders
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}';
update public.orders set order_status = 'processing' where order_code = 'TEST-0001';
select is(
  (select order_status from public.orders where order_code = 'TEST-0001'),
  'processing',
  'an admin user with an aal2 session can update orders'
);

-- 11. Admin WITHOUT aal2 cannot update orders. Verification reads as
-- postgres (RLS-bypassing) rather than under the aal1 claim itself: after
-- this migration that claim can no longer SELECT orders at all (test 9), so
-- re-querying under it would trivially return NULL regardless of whether
-- the UPDATE actually mutated the row — this must independently confirm
-- the row's true persisted state.
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"}}';
update public.orders set order_status = 'cancelled' where order_code = 'TEST-0001';
set local role postgres;
reset "request.jwt.claims";
select is(
  (select order_status from public.orders where order_code = 'TEST-0001'),
  'processing',
  'an admin at aal1 (no MFA) cannot update orders (RLS filters to zero matching rows; status unchanged)'
);

-- ── Settings ─────────────────────────────────────────────────────────────
set local role anon;
reset "request.jwt.claims";

-- 12. Public sees only is_public settings, never the private one
select is(
  (select count(*)::int from public.settings where key in ('test-public-setting', 'test-private-setting')),
  1,
  'anon can see only the is_public=true test setting, not the private one'
);

-- 13. Admin at aal2 can see the private setting too
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}';
select is(
  (select count(*)::int from public.settings where key in ('test-public-setting', 'test-private-setting')),
  2,
  'an admin user with an aal2 session can see both the public and private test settings'
);

-- 14. Admin WITHOUT aal2 sees only the public setting, same as anon
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"}}';
select is(
  (select count(*)::int from public.settings where key in ('test-public-setting', 'test-private-setting')),
  1,
  'an admin at aal1 (no MFA) sees only the is_public=true setting, same as an unprivileged caller'
);

-- 15. Admin at aal2 can update settings
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}';
update public.settings set value = '{"note":"updated"}'::jsonb where key = 'test-private-setting';
select is(
  (select value ->> 'note' from public.settings where key = 'test-private-setting'),
  'updated',
  'an admin user with an aal2 session can update settings'
);

-- 16. Admin WITHOUT aal2 cannot update settings. Verification read as
-- postgres (RLS-bypassing) for the same reason as test 11 above: the aal1
-- claim can no longer SELECT the private setting at all (test 14), so
-- re-querying under it would trivially return NULL either way.
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"}}';
update public.settings set value = '{"note":"tampered"}'::jsonb where key = 'test-private-setting';
set local role postgres;
reset "request.jwt.claims";
select is(
  (select value ->> 'note' from public.settings where key = 'test-private-setting'),
  'updated',
  'an admin at aal1 (no MFA) cannot update settings (RLS filters to zero matching rows; value unchanged)'
);

-- ── Storage: payment-slips bucket ───────────────────────────────────────
set local role anon;
reset "request.jwt.claims";

-- 17. Private slip objects cannot be read publicly
select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'payment-slips' and name = 'test-order-id/slip.png' $$,
  'anon cannot read payment-slips storage objects'
);

-- 18. Admin at aal2 can read slip objects
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}';
select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'payment-slips' and name = 'test-order-id/slip.png' $$,
  'an admin user with an aal2 session can read payment-slips storage objects'
);

-- 19. Admin WITHOUT aal2 cannot read slip objects
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"}}';
select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'payment-slips' and name = 'test-order-id/slip.png' $$,
  'an admin at aal1 (no MFA) cannot read payment-slips storage objects'
);

select * from finish();
rollback;
