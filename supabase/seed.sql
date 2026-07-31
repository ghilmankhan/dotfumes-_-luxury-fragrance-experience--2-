-- Local-development-only seed data, applied automatically by
-- `supabase db reset` against the LOCAL Supabase stack. This file is never
-- run against the remote (jguewximloxmbhpsoxjb) project.
--
-- Contains NO real customer data, NO real payment slips, NO production
-- administrator account, and NO secrets of any kind (passwords, service
-- keys, access tokens). All rows below are clearly fictional test fixtures.
--
-- Deliberately does NOT create a test administrator user here. Creating an
-- Auth user correctly (password hashing, email confirmation state, etc.)
-- should go through Supabase Auth itself, not a raw INSERT into auth.users
-- in a seed file — see docs/supabase-migration/16-first-owner-and-mfa-runbook.md
-- for the supported procedure to create a local/first admin.

-- ── Products: minimal fixture catalog for local development/testing ──────
insert into public.products (slug, name, price, stock, active, category)
values
  ('seed-oud-noir', 'Oud Noir (seed data)', 45.00, 20, true, 'Unisex'),
  ('seed-rose-blanche', 'Rose Blanche (seed data)', 38.00, 15, true, 'Women'),
  ('seed-cedar-and-smoke', 'Cedar & Smoke (seed data)', 42.00, 10, true, 'Men'),
  ('seed-discontinued-scent', 'Discontinued Scent (seed data, inactive)', 30.00, 0, false, 'Unisex')
on conflict (slug) do nothing;

-- ── Settings: minimal checkout configuration the create_order RPC reads ──
insert into public.settings (key, value, is_public)
values
  (
    'checkout',
    jsonb_build_object(
      'currency', 'USD',
      'deliveryFee', 5.00,
      'allowOutOfStockCheckout', false
    ),
    true
  )
on conflict (key) do nothing;

-- ── Local test environment marker ──────────────────────────────────────
-- Added 2026-08-01 (Foundation Artifact Preservation pass). Presence of this
-- row is checked by every pgTAP file under supabase/tests/ before those files
-- do anything else — since seed.sql is applied only by `supabase db reset`
-- against the LOCAL Supabase stack (see this file's own header comment) and
-- is never run against the remote (jguewximloxmbhpsoxjb) project, a database
-- missing this row is, by construction, not a database this test suite has
-- ever seeded — the tests refuse to run (fail closed) rather than guess from
-- a database name. This does not depend on any project-specific naming
-- convention and requires no new table/migration.
insert into public.settings (key, value, is_public)
values (
  '__local_test_environment_marker',
  jsonb_build_object(
    'established_by', 'supabase/seed.sql',
    'purpose', 'guards supabase/tests/*.test.sql against running against a non-local database'
  ),
  false
)
on conflict (key) do nothing;
