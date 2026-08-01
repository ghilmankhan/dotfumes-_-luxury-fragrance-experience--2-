-- Reconstructs two `storage.objects` RLS policies on the `payment-slips`
-- bucket that exist on the remote project (jguewximloxmbhpsoxjb). Verified
-- live and read-only against remote during the Foundation validation-gate
-- correction pass (2026-08-01):
--
--   select schemaname, tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies where schemaname = 'storage';
--
-- returned exactly:
--   "Admins can read payment slips"   SELECT authenticated  bucket_id = 'payment-slips' AND private.is_admin()
--   "Admins can delete payment slips" DELETE authenticated  bucket_id = 'payment-slips' AND private.is_admin()
--
-- Both were independently documented earlier in
-- docs/supabase-migration/12-rls-and-authorization-audit.md's full
-- `pg_policies` table, which this query reconfirms unchanged.
--
-- These were omitted from 20260730185111_baseline_remote_schema.sql because
-- that reconstruction was built from `supabase db dump --schema public` /
-- `--schema private` output, which does not include the `storage` schema.
-- The gap was only caught when
-- supabase/tests/existing_tables_rls.test.sql test 10 ("an admin user can
-- read payment-slips storage objects") failed against a local stack that
-- otherwise matched remote exactly in every dumped schema (see
-- 16c-public-full.diff / 16d-private-full.diff, both clean apart from one
-- unrelated pending-migration grant).
--
-- This migration reproduces existing, verified remote state — it does not
-- add new Storage functionality. There is still no INSERT policy for
-- anyone: uploads happen exclusively through the service_role-backed
-- create-order edge function, which bypasses RLS, consistent with the
-- architecture already documented in 12-rls-and-authorization-audit.md.
-- `storage.objects` ships with RLS already enabled by the Supabase platform,
-- so no `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is needed here.

create policy "Admins can read payment slips"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'payment-slips' and (select private.is_admin()));

create policy "Admins can delete payment slips"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'payment-slips' and (select private.is_admin()));
