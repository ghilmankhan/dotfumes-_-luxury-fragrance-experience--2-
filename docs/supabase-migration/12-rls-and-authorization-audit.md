# 12 — RLS and Authorization Audit

All content below is from direct SQL introspection this pass (`pg_policies`,
`information_schema.role_table_grants`/`column_privileges`/`routine_privileges`, `pg_proc`,
`pg_class.relrowsecurity`) — not carried over from the prior report without re-verification.

## `private.is_admin()` — full audit

```sql
CREATE OR REPLACE FUNCTION private.is_admin()
 RETURNS boolean LANGUAGE sql STABLE
 SET search_path TO ''
AS $function$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$function$
```

| Attribute | Value | Verified via |
|---|---|---|
| Schema | `private` (not exposed to the Data API by default — only `public`/`graphql_public` are exposed unless explicitly configured otherwise) | `pg_proc`/`pg_namespace` |
| `SECURITY DEFINER`? | **No — SECURITY INVOKER** (`prosecdef: false`) | `pg_proc.prosecdef` |
| Fixed `search_path`? | Yes, `''` (empty) | `pg_proc.proconfig` |
| JWT claim source | `auth.jwt() -> 'app_metadata' ->> 'role'` — correct, uses `app_metadata` (not user-editable), not `user_metadata` | Function body |
| Anonymous-user behavior | `auth.jwt()` for an unauthenticated request returns null/empty → `coalesce(..., false)` → returns `false` | Function body logic |
| Function grants (`EXECUTE`) | `PUBLIC`, `anon`, `authenticated`, `postgres` | `information_schema.routine_privileges` |
| Is this a risk given the broad EXECUTE grant? | **No.** Because it's `SECURITY INVOKER` (not DEFINER) and only reads `auth.jwt()` — the caller's own JWT — granting `EXECUTE` broadly cannot let anyone read or affect another user's data or elevate privilege. The "SECURITY DEFINER functions in public are callable by all roles" risk pattern specifically does not apply here. | Direct reasoning from verified function properties |
| Used by every admin-gated policy? | **Yes — verified, no drift.** All 7 admin-gated policies across `orders`/`products`/`settings`/`storage.objects` call `private.is_admin()` as their sole condition (see policy table below). No table uses a different admin authority. | `pg_policies`, full text match |

## Full `pg_policies` table (public, private, storage — audit, private has none, verified empty)

| Schema | Table | Policy | Command | Roles | Condition |
|---|---|---|---|---|---|
| public | orders | Admins can delete orders | DELETE | authenticated | `private.is_admin()` |
| public | orders | Admins can read orders | SELECT | authenticated | `private.is_admin()` |
| public | orders | Admins can update orders | UPDATE | authenticated | `private.is_admin()` (both USING and WITH CHECK) |
| public | products | Admins can delete products | DELETE | authenticated | `private.is_admin()` |
| public | products | Admins can insert products | INSERT | authenticated | WITH CHECK `private.is_admin()` |
| public | products | Admins can update products | UPDATE | authenticated | `private.is_admin()` (both) |
| public | products | Public can read active products | SELECT | anon, authenticated | `active OR private.is_admin()` |
| public | profiles | profiles_select_own | SELECT | authenticated | `auth.uid() = id` |
| public | profiles | profiles_update_own | UPDATE | authenticated | `auth.uid() = id` (both) |
| public | settings | Admins can delete settings | DELETE | authenticated | `private.is_admin()` |
| public | settings | Admins can insert settings | INSERT | authenticated | WITH CHECK `private.is_admin()` |
| public | settings | Admins can update settings | UPDATE | authenticated | `private.is_admin()` (both) |
| public | settings | Public can read public settings | SELECT | anon, authenticated | `is_public OR private.is_admin()` |
| storage | objects | Admins can delete payment slips | DELETE | authenticated | `bucket_id = 'payment-slips' AND private.is_admin()` |
| storage | objects | Admins can read payment slips | SELECT | authenticated | `bucket_id = 'payment-slips' AND private.is_admin()` |

**Notable gap, verified, not previously documented:** `orders` has **no INSERT policy for anyone**
(`anon` or `authenticated`) and **no customer-facing SELECT policy**. This is consistent with
order creation happening exclusively through the `service_role`-backed `create-order` edge
function (which bypasses RLS entirely as `service_role`) — but it also means there is currently
**no way for any authenticated, non-admin user to read their own order** via the Data API. This
directly supports the "order lookup" gap flagged in 09-foundation-decisions.md decision 1.
`storage.objects` for `payment-slips` similarly has **no INSERT policy** — uploads happen only via
the edge function's service-role client, which also bypasses RLS, consistent with the same
architecture.

## RLS-enabled status per table (verified, not assumed)

| Table | `relrowsecurity` | `relforcerowsecurity` |
|---|---|---|
| orders | true | false |
| products | true | false |
| profiles | true | false |
| settings | true | false |

`relforcerowsecurity = false` on all four means the table owner (`postgres`) and any role with
`BYPASSRLS` (`service_role`, `postgres`) still bypass RLS entirely, as expected/intended — this is
standard, not a misconfiguration, since the edge function relies on exactly this behavior via
`service_role`.

## `rls_auto_enable` — a previously undocumented safety mechanism (new finding)

```sql
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$ ... alter table if exists %s enable row level security ... $function$
```

An **event trigger** function (verified present via `pg_proc`, part of one of the 3 original
un-captured migrations, most likely `harden_rls_and_atomic_order_creation` based on its name and
purpose) that automatically runs `ENABLE ROW LEVEL SECURITY` on any new table created in `public`.
This was **not mentioned in any prior-pass document**. Its existence is good news for Floor 1 and
beyond: it means any future `CREATE TABLE` in `public` gets RLS enabled automatically, closing off
the single most common Supabase misconfiguration (a new exposed table with no RLS at all) even if
a future migration author forgets to enable it explicitly. It does **not** create any policies —
an auto-RLS-enabled table with zero policies is still fully deny-by-default until policies are
added, which is the safe default. `SECURITY DEFINER` here is appropriate and expected for an event
trigger (they always run with elevated privilege to alter arbitrary new objects), and it is scoped
to `pg_catalog` only in its `search_path`, with a hardcoded schema allow-list (`'public'`) inside
the function body — it will not act on tables created in other schemas.

## Authorization source-of-truth conclusion

**Single source of truth, verified, no drift:** `app_metadata.role = 'admin'`, read exclusively via
`private.is_admin()`. Confirmed consumers:
- **Database RLS:** all 7 admin-gated policies (table above).
- **Client code:** `AdminPage.tsx:47-48`, `isAdminSession = session.user.app_metadata?.role === 'admin'` — reads the same claim, client-side, for UI gating only (not a security boundary by itself, matches the "duplicates but does not replace" note in 05-security-findings.md).
- **Edge Functions:** `create-order` does not perform any admin check (it's a public endpoint by design) — no drift risk there since it doesn't claim to be admin-gated.
- **No second authority found anywhere** — `public.user_roles` does not exist (verified via `list_tables`), so there is no possibility of a `user_roles`-vs-`app_metadata` drift today. This risk only becomes real if/when `user_roles` is built per a future decision.

**Recommended decision:** none required right now — the current single-authority model is
internally consistent and fully verified. The only actionable item is the Low-severity
`profiles.updated_at` column-grant tightening noted in 10-foundation-verification.md.
