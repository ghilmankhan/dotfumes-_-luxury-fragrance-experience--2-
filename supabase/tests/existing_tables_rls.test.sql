-- Executable pgTAP tests for the existing public.products, public.orders,
-- public.settings, and storage.objects (payment-slips bucket) RLS policies.
-- NOT EXECUTED as of this pass — no local Docker stack is available in this
-- environment (see docs/supabase-migration/14-local-rebuild-and-test-results.md).
-- Written to be run once that blocker is resolved.
--
-- Fixtures (products/settings/orders/storage rows, one admin auth user) are
-- inserted as `postgres` (bypasses RLS) inside this file's own transaction,
-- which is rolled back at the end. Only ever run against a local/test
-- database, never the remote project.

begin;
select plan(10);

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
  order_code, customer_name, customer_phone, items, subtotal, delivery_fee, total,
  payment_method, order_status, payment_status
) values (
  'TEST-0001', 'Test Customer', '923000000000', '[]'::jsonb, 10.00, 0.00, 10.00,
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

-- 2. Public cannot modify products
select throws_ok(
  $$ update public.products set price = 0.01 where slug = 'test-active-scent' $$,
  '42501',
  'anon cannot update products (insufficient_privilege)'
);

-- 3. Non-admin authenticated user cannot modify products
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{}}';
select throws_ok(
  $$ update public.products set price = 0.01 where slug = 'test-active-scent' $$,
  '42501',
  'a non-admin authenticated user cannot update products (insufficient_privilege)'
);

-- 4. Admin can modify products
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"}}';
update public.products set price = 12.34 where slug = 'test-active-scent';
select is(
  (select price from public.products where slug = 'test-active-scent'),
  12.34,
  'an admin user can update products'
);

-- ── Orders ───────────────────────────────────────────────────────────────
set local role anon;
reset "request.jwt.claims";

-- 5. Public cannot read orders
select is_empty(
  $$ select 1 from public.orders $$,
  'anon cannot read any row from public.orders'
);

-- 6. Non-admin authenticated user cannot read orders
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{}}';
select is_empty(
  $$ select 1 from public.orders $$,
  'a non-admin authenticated user cannot read any row from public.orders'
);

-- 7. Admin can read orders
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"}}';
select isnt_empty(
  $$ select 1 from public.orders where order_code = 'TEST-0001' $$,
  'an admin user can read orders'
);

-- ── Settings ─────────────────────────────────────────────────────────────
set local role anon;
reset "request.jwt.claims";

-- 8. Public sees only is_public settings; admin sees both
select is(
  (select count(*)::int from public.settings where key in ('test-public-setting', 'test-private-setting')),
  1,
  'anon can see only the is_public=true test setting, not the private one'
);

-- ── Storage: payment-slips bucket ───────────────────────────────────────
set local role anon;
reset "request.jwt.claims";

-- 9. Private slip objects cannot be read publicly
select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'payment-slips' and name = 'test-order-id/slip.png' $$,
  'anon cannot read payment-slips storage objects'
);

-- 10. Admin can read slip objects
set local role authenticated;
set local "request.jwt.claims" to
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"admin"}}';
select isnt_empty(
  $$ select 1 from storage.objects where bucket_id = 'payment-slips' and name = 'test-order-id/slip.png' $$,
  'an admin user can read payment-slips storage objects'
);

select * from finish();
rollback;
