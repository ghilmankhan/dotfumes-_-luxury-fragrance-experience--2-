-- Base security-closure correction (2026-08-02): the previous Base pass
-- (20260801175838_add_granular_authorization_roles.sql,
-- 20260801183254_establish_audit_boundary.sql) gated public.grant_role()/
-- revoke_role() on aal2, and the AdminPage frontend gated its own dashboard
-- on aal2 — but every server-side RLS policy that actually protects staff
-- data (orders, products/settings mutation, payment-slips Storage,
-- user_roles/audit visibility) still only checked private.is_admin(), with
-- no assurance-level requirement at all. Frontend checks are UX, not an
-- authorization boundary: any aal1 admin session (e.g. a stolen bearer
-- token, or a direct REST/RPC call) could read/mutate every one of those
-- resources without ever completing an MFA challenge. This migration closes
-- that gap by introducing one reusable pair of helpers and re-pointing every
-- privileged (non-public) RLS branch at them, instead of duplicating raw
-- JWT parsing in each policy.
--
-- Deliberately NOT touched (per the Base security-closure scope): anonymous
-- guest checkout (public.create_order via service_role, bypasses RLS
-- entirely), public catalog reads (products.active = true, settings.is_public
-- = true), password recovery / MFA enrollment bootstrap (no aal2 can exist
-- yet by definition), and public.grant_role()/revoke_role()'s own in-body
-- aal2 check (already correct — refactored below to call the same helper
-- instead of re-parsing the JWT, but behavior is unchanged).

-- 1. Reusable assurance-level helpers (private schema, SECURITY INVOKER) ----

create or replace function private.has_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false);
$$;

comment on function private.has_aal2() is
  'True iff the caller''s current session has completed an MFA challenge '
  '(aal2). auth.jwt() returns null claims for anon/malformed tokens, so this '
  'fails closed (coalesced to false) rather than raising or defaulting open.';

create or replace function private.is_admin_mfa()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_admin() and private.has_aal2();
$$;

comment on function private.is_admin_mfa() is
  'True iff the caller is admin/owner (private.is_admin()) AND holds an '
  'aal2 session. This is the required check for every sensitive staff '
  'operation (orders, product/settings administration, payment-slip '
  'review, role and audit visibility) — private.is_admin() alone is no '
  'longer sufficient for any of those surfaces. Public/anonymous-facing '
  'branches (active products, is_public settings) intentionally do not use '
  'this helper and are unaffected.';

-- Granted broadly (anon + authenticated), matching private.is_admin()'s own
-- grant pattern, so both helpers stay embeddable in the mixed `to
-- authenticated, anon` policies on products/settings. For an anon caller
-- auth.jwt() is null, so both always evaluate to false — no schema-level
-- error, consistent with how private.is_admin() already behaves for anon.
grant execute on function private.has_aal2() to anon, authenticated;
grant execute on function private.is_admin_mfa() to anon, authenticated;

-- 2. Orders: full staff surface now requires aal2 --------------------------

drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders"
  on public.orders for select
  to authenticated
  using ((select private.is_admin_mfa()));

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders for update
  to authenticated
  using ((select private.is_admin_mfa()))
  with check ((select private.is_admin_mfa()));

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders"
  on public.orders for delete
  to authenticated
  using ((select private.is_admin_mfa()));

-- 3. Products: public catalog read stays untouched; the admin-visibility/
-- admin-mutation branches now require aal2 -----------------------------

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products for select
  to authenticated, anon
  using (active or (select private.is_admin_mfa()));

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products for insert
  to authenticated
  with check ((select private.is_admin_mfa()));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update
  to authenticated
  using ((select private.is_admin_mfa()))
  with check ((select private.is_admin_mfa()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete
  to authenticated
  using ((select private.is_admin_mfa()));

-- 4. Settings: same pattern as products -------------------------------------

drop policy if exists "Public can read public settings" on public.settings;
create policy "Public can read public settings"
  on public.settings for select
  to authenticated, anon
  using (is_public or (select private.is_admin_mfa()));

drop policy if exists "Admins can insert settings" on public.settings;
create policy "Admins can insert settings"
  on public.settings for insert
  to authenticated
  with check ((select private.is_admin_mfa()));

drop policy if exists "Admins can update settings" on public.settings;
create policy "Admins can update settings"
  on public.settings for update
  to authenticated
  using ((select private.is_admin_mfa()))
  with check ((select private.is_admin_mfa()));

drop policy if exists "Admins can delete settings" on public.settings;
create policy "Admins can delete settings"
  on public.settings for delete
  to authenticated
  using ((select private.is_admin_mfa()));

-- 5. Storage: payment-slips review/delete now requires aal2 -----------------

drop policy if exists "Admins can read payment slips" on storage.objects;
create policy "Admins can read payment slips"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'payment-slips' and (select private.is_admin_mfa()));

drop policy if exists "Admins can delete payment slips" on storage.objects;
create policy "Admins can delete payment slips"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'payment-slips' and (select private.is_admin_mfa()));

-- 6. user_roles admin-visibility and audit log: same role-management
-- surface as grant_role()/revoke_role(), so held to the same aal2 bar -----

drop policy if exists "user_roles_select_admin" on public.user_roles;
create policy "user_roles_select_admin"
  on public.user_roles
  for select
  to authenticated
  using ( (select private.is_admin_mfa()) );

drop policy if exists "role_changes_select_admin" on audit.role_changes;
create policy "role_changes_select_admin"
  on audit.role_changes
  for select
  to authenticated
  using ( (select private.is_admin_mfa()) );

-- 7. grant_role()/revoke_role(): refactored to call the shared helper
-- instead of duplicating raw JWT parsing. Behavior is unchanged from
-- 20260801175838_add_granular_authorization_roles.sql /
-- 20260801183254_establish_audit_boundary.sql — same signatures, same
-- checks, same audit-insert — except the final-owner check below, which is
-- also made concurrency-safe (see comment inline).

create or replace function public.grant_role(target_user uuid, new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  caller_is_service boolean := (select auth.role()) = 'service_role';
begin
  if not caller_is_service then
    if caller is null then
      raise exception 'AUTH_REQUIRED: must be authenticated to grant a role';
    end if;

    if caller = target_user then
      raise exception 'SELF_ESCALATION_DENIED: cannot grant a role to yourself';
    end if;

    if not private.is_admin() then
      raise exception 'FORBIDDEN: only admin or owner may grant roles';
    end if;

    if new_role in ('admin', 'owner') and not private.is_owner() then
      raise exception 'FORBIDDEN: only an owner may grant admin or owner roles';
    end if;

    if not private.has_aal2() then
      raise exception 'MFA_REQUIRED: role grants require an aal2 (MFA-verified) session';
    end if;
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (target_user, new_role, caller)
  on conflict (user_id, role) do nothing;

  insert into audit.role_changes (actor, action, target_user, role, metadata)
  values (caller, 'grant', target_user, new_role, jsonb_build_object('caller_is_service', caller_is_service));
end;
$$;

create or replace function public.revoke_role(target_user uuid, target_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  caller_is_service boolean := (select auth.role()) = 'service_role';
  remaining_owners int;
begin
  if not caller_is_service then
    if caller is null then
      raise exception 'AUTH_REQUIRED: must be authenticated to revoke a role';
    end if;

    if not private.is_admin() then
      raise exception 'FORBIDDEN: only admin or owner may revoke roles';
    end if;

    if target_role in ('admin', 'owner') and not private.is_owner() then
      raise exception 'FORBIDDEN: only an owner may revoke admin or owner roles';
    end if;

    if not private.has_aal2() then
      raise exception 'MFA_REQUIRED: role revocation requires an aal2 (MFA-verified) session';
    end if;
  end if;

  -- Final-owner protection, made concurrency-safe: the previous version
  -- (20260801175838) did `select count(*) ...` then `delete ...` as two
  -- separate statements with no lock between them, so two concurrent
  -- revoke_role('owner') calls targeting two different owners could each
  -- observe remaining_owners = 2 before either commits, both pass the
  -- check, and leave zero owners. pg_advisory_xact_lock serializes every
  -- owner-targeting revoke_role call (including service_role's) on a single
  -- fixed key, held until this transaction ends, so a second concurrent
  -- caller blocks here and re-evaluates remaining_owners only after the
  -- first has committed its delete.
  if target_role = 'owner' then
    perform pg_advisory_xact_lock(hashtext('public.user_roles:owner_role_lock'));

    select count(*) into remaining_owners from public.user_roles where role = 'owner';
    if remaining_owners <= 1
       and exists (select 1 from public.user_roles where user_id = target_user and role = 'owner')
    then
      raise exception 'LAST_OWNER_PROTECTED: cannot remove the final remaining owner';
    end if;
  end if;

  delete from public.user_roles where user_id = target_user and role = target_role;

  insert into audit.role_changes (actor, action, target_user, role, metadata)
  values (caller, 'revoke', target_user, target_role, jsonb_build_object('caller_is_service', caller_is_service));
end;
$$;

-- create or replace preserves prior grants, but re-assert explicitly since
-- this is a security-sensitive boundary and grants must never depend on
-- migration-application order for their correctness.
revoke all on function public.grant_role(uuid, public.app_role) from public, anon;
revoke all on function public.revoke_role(uuid, public.app_role) from public, anon;
grant execute on function public.grant_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.revoke_role(uuid, public.app_role) to authenticated, service_role;
