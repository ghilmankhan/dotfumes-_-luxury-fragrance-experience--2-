# Migration history gap

This directory captures migrations going forward. It does **not** yet contain the 3 migrations
that built the current live schema, applied directly to the remote project before this file
existed:

- `20260730181201_init_commerce_schema`
- `20260730181213_payment_slips_bucket`
- `20260730185111_harden_rls_and_atomic_order_creation`

Their exact SQL was not reconstructed here — only introspected end-state was available (via
`list_tables`/`execute_sql`), and hand-writing migration files that *claim* to reproduce
history I can't verify would risk silently diverging from the real DDL (trigger bodies, grants,
etc.) if anyone ever ran `supabase db reset` against them.

**To close this gap:** install the Supabase CLI, `supabase link --project-ref jguewximloxmbhpsoxjb`,
then `supabase db pull` — this backfills the 3 migrations above as real files from the actual
remote history. Do this before relying on `supabase db reset` / local `supabase start` to fully
reproduce the current production schema.

`20260731174520_add_profiles_foundation.sql` (this task) is safe as-is: it was applied via
`apply_migration` and its file here is an exact copy of what was executed.
