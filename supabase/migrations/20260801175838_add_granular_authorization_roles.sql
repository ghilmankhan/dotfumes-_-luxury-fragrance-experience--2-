-- Base requirement (docs/supabase-migration/00-commerce-os-phase-ownership.md):
-- "user_roles; roles including customer, support, inventory manager, payment
-- reviewer, admin and owner; controlled role grant/revoke operations."
--
-- This migration adds an additive, normalized role model on top of the
-- existing single-admin `private.is_admin()` helper (introduced in
-- 20260730185111_baseline_remote_schema.sql). It does NOT remove or replace
-- that helper — it extends it so existing RLS policies embedding
-- `private.is_admin()` (products, orders, settings, payment-slip Storage
-- policies) keep working unchanged, while gaining a second, additive path to
-- "true": holding an 'admin' or 'owner' row in the new public.user_roles
-- table. This is the "backward-compatible transition from the current
-- binary admin helper" required by this phase.
--
-- No application permissions beyond the six named Base roles are invented
-- here. Fine-grained per-resource authorization for Floor 1/2 tables that do
-- not exist yet is intentionally left to those floors.

-- 1. Role enum -----------------------------------------------------------

create type public.app_role as enum (
  'customer',
  'support',
  'inventory_manager',
  'payment_reviewer',
  'admin',
  'owner'
);

-- 2. user_roles table ------------------------------------------------------
-- One row per (user, role) grant. A user may hold multiple roles
-- simultaneously (e.g. support + inventory_manager). granted_by is nullable
-- because the default 'customer' role is system-assigned at signup, not
-- granted by another user.

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (user_id, role)
);

comment on table public.user_roles is
  'Additive normalized role grants. A user may hold zero or more roles. '
  'Mutated exclusively via public.grant_role()/public.revoke_role() '
  '(SECURITY DEFINER) — no direct INSERT/UPDATE/DELETE grant exists for '
  'anon or authenticated, so the table itself is read-only to clients.';

create index user_roles_role_idx on public.user_roles (role);

alter table public.user_roles enable row level security;

-- Deny-by-default, plus two narrow SELECT policies: a user may always see
-- their own role rows (needed for frontend role retrieval), and an
-- admin/owner may see every row (needed for a future role-management UI and
-- for the grant/revoke boundary logic below). No INSERT/UPDATE/DELETE policy
-- exists for any client role — combined with the revoked table grants below,
-- direct client mutation is impossible regardless of RLS.

create policy "user_roles_select_own"
  on public.user_roles
  for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "user_roles_select_admin"
  on public.user_roles
  for select
  to authenticated
  using ( (select private.is_admin()) );

revoke all on public.user_roles from anon, authenticated;
-- SELECT (not INSERT/UPDATE/DELETE) is granted so the two policies above can
-- apply; anon has no policy at all, so anon always sees zero rows without
-- ever raising a permission error (required so private.is_admin(), which is
-- called from anon-facing RLS policies on products/orders, can safely query
-- this table for anonymous storefront visitors).
grant select on public.user_roles to anon, authenticated;

-- 3. Authorization helpers (private schema, SECURITY INVOKER) -------------

create or replace function private.has_role(check_role public.app_role)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and role = check_role
  );
$$;

comment on function private.has_role(public.app_role) is
  'True iff the calling user holds check_role. SECURITY INVOKER: relies on '
  'the user_roles_select_own RLS policy, so it only ever reports the '
  'caller''s own roles, never another user''s.';

create or replace function private.is_owner()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.has_role('owner');
$$;

-- Granted broadly (like private.is_admin()) so these reusable helpers stay
-- embeddable in any future RLS policy, anon-facing or not.
grant execute on function private.has_role(public.app_role) to anon, authenticated;
grant execute on function private.is_owner() to anon, authenticated;

-- Additive redefinition (same signature, CREATE OR REPLACE — grants to anon/
-- authenticated made in the baseline migration are preserved automatically).
-- True if EITHER the legacy JWT app_metadata claim says admin (unchanged
-- behavior, keeps 20260730185111's RLS and authorization_is_admin.test.sql
-- passing as-is) OR the caller holds an 'admin' or 'owner' row in
-- user_roles (new path).
create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    or exists (
      select 1 from public.user_roles
      where user_id = (select auth.uid())
        and role in ('admin', 'owner')
    );
$$;

-- 4. Default customer role on signup ---------------------------------------
-- Additive redefinition of the existing signup trigger function (same
-- signature/trigger binding as 20260731174520_add_profiles_foundation.sql)
-- to also assign the default 'customer' role. This is a system assignment,
-- not a call to public.grant_role(), so it is exempt from that function's
-- caller-privilege checks by construction (it never calls it).

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- 5. Controlled grant/revoke RPCs (SECURITY DEFINER) -----------------------
--
-- Both functions are SECURITY DEFINER because granting/revoking another
-- user's role requires writing a row the caller does not own, which no RLS
-- policy permits (by design — see section 2). All authorization is
-- re-checked explicitly in the function body per the security checklist
-- (never rely on SECURITY DEFINER alone).
--
-- service_role bootstrap exemption: the very first 'owner' cannot be
-- granted by another owner/admin (none exists yet). service_role (the
-- Postgres role backing server-side/service-key callers, never exposed to
-- browser code per this project's env-var rules) is exempted from the
-- caller-privilege and MFA checks so an operator can bootstrap the first
-- owner via a service-key script. It is NOT exempt from the final-owner
-- and duplicate-role invariants below, which are enforced unconditionally.

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

    if (select auth.jwt() ->> 'aal') is distinct from 'aal2' then
      raise exception 'MFA_REQUIRED: role grants require an aal2 (MFA-verified) session';
    end if;
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (target_user, new_role, caller)
  on conflict (user_id, role) do nothing;
end;
$$;

comment on function public.grant_role(uuid, public.app_role) is
  'Controlled role grant. Caller must be admin/owner with an aal2 session; '
  'only an owner may grant admin/owner; self-grants are always rejected. '
  'Idempotent: granting an already-held role is a no-op, not an error.';

create or replace function public.revoke_role(target_user uuid, target_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_is_service boolean := (select auth.role()) = 'service_role';
  remaining_owners int;
begin
  if not caller_is_service then
    if (select auth.uid()) is null then
      raise exception 'AUTH_REQUIRED: must be authenticated to revoke a role';
    end if;

    if not private.is_admin() then
      raise exception 'FORBIDDEN: only admin or owner may revoke roles';
    end if;

    if target_role in ('admin', 'owner') and not private.is_owner() then
      raise exception 'FORBIDDEN: only an owner may revoke admin or owner roles';
    end if;

    if (select auth.jwt() ->> 'aal') is distinct from 'aal2' then
      raise exception 'MFA_REQUIRED: role revocation requires an aal2 (MFA-verified) session';
    end if;
  end if;

  -- Final-owner protection: enforced unconditionally, even for service_role.
  if target_role = 'owner' then
    select count(*) into remaining_owners from public.user_roles where role = 'owner';
    if remaining_owners <= 1
       and exists (select 1 from public.user_roles where user_id = target_user and role = 'owner')
    then
      raise exception 'LAST_OWNER_PROTECTED: cannot remove the final remaining owner';
    end if;
  end if;

  delete from public.user_roles where user_id = target_user and role = target_role;
end;
$$;

comment on function public.revoke_role(uuid, public.app_role) is
  'Controlled role revoke. Caller must be admin/owner with an aal2 session; '
  'only an owner may revoke admin/owner; the last remaining owner can never '
  'be revoked, by anyone, including service_role.';

-- `revoke ... from public` only strips the implicit PUBLIC-pseudo-role
-- grant; it does NOT undo the explicit per-role EXECUTE grant that
-- 20260730185111_baseline_remote_schema.sql's
-- `alter default privileges ... in schema public grant all on functions to
-- anon` applies automatically to every new public-schema function at
-- creation time. anon must be revoked explicitly, or an unauthenticated
-- caller could invoke these SECURITY DEFINER functions directly (the
-- in-body `caller is null` check would still reject them, but defense in
-- depth means anon should never reach the function body at all).
revoke all on function public.grant_role(uuid, public.app_role) from public, anon;
revoke all on function public.revoke_role(uuid, public.app_role) from public, anon;
grant execute on function public.grant_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.revoke_role(uuid, public.app_role) to authenticated, service_role;

-- 6. Role retrieval for the frontend ---------------------------------------
-- SECURITY INVOKER: relies on user_roles_select_own, so it only ever
-- returns the caller's own roles.

create or replace function public.get_my_roles()
returns setof public.app_role
language sql
stable
set search_path = ''
as $$
  select role from public.user_roles where user_id = (select auth.uid());
$$;

grant execute on function public.get_my_roles() to authenticated;
