-- Base requirement (docs/supabase-migration/00-commerce-os-phase-ownership.md):
-- "public/private/audit schema strategy." This migration establishes the
-- minimum reusable audit *foundation* for Base — not a general business-event
-- audit platform (explicitly out of scope; Floor 2/Floor 7 own broader
-- event auditing for orders/checkout if ever built). The concrete scope
-- chosen here is the narrowest one already justified by this same Base
-- pass: an append-only log of the one privileged, sensitive mutation Base
-- introduces — public.grant_role()/public.revoke_role() calls
-- (20260801175838_add_granular_authorization_roles.sql). No other table
-- currently has a privileged write path that would benefit from an audit
-- trail without speculative scope expansion.

create schema if not exists audit;

comment on schema audit is
  'Append-only audit records for privileged mutations. Never exposed '
  'directly via the PostgREST API (not in db.schemas) — read access is only '
  'through the admin-gated public.list_role_change_audit_log() wrapper '
  'below, matching the private schema''s existing not-directly-exposed '
  'pattern.';

-- USAGE is granted only to authenticated, never anon — unlike public schema
-- objects (e.g. private.is_admin()), nothing in this schema is ever
-- embedded inside an anon-facing RLS policy, so there is no legitimate anon
-- use case. An anon query against anything in this schema correctly fails
-- at the schema-permission level (a harder, earlier denial than RLS).
grant usage on schema audit to authenticated;

create table audit.role_changes (
  id uuid primary key default gen_random_uuid(),
  -- Null actor means a service_role-authenticated caller (e.g. first-owner
  -- bootstrap) — auth.uid() itself is null for service_role, so this is not
  -- a nullable-by-omission bug, it is the only value possible in that case.
  actor uuid references auth.users(id) on delete set null,
  action text not null check (action in ('grant', 'revoke')),
  target_user uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  -- Safe, minimal metadata only — booleans/flags, never a request body, JWT,
  -- or other sensitive payload. Currently records only whether the caller
  -- authenticated as service_role, which is already derivable from actor
  -- being null but kept explicit for readability.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table audit.role_changes is
  'Append-only record of every successful public.grant_role()/revoke_role() '
  'call. Written exclusively by those two SECURITY DEFINER functions — no '
  'client role holds INSERT/UPDATE/DELETE, so this table cannot be edited '
  'or backfilled by anyone after the fact, including an admin.';

create index role_changes_target_user_idx on audit.role_changes (target_user);

alter table audit.role_changes enable row level security;

-- Read-only, admin/owner-only, no INSERT/UPDATE/DELETE policy for any
-- client role at all (writes happen only via the SECURITY DEFINER functions
-- below, which execute as the table owner and so bypass RLS entirely).
create policy "role_changes_select_admin"
  on audit.role_changes
  for select
  to authenticated
  using ( (select private.is_admin()) );

revoke all on audit.role_changes from anon, authenticated;
grant select on audit.role_changes to authenticated;

-- Privileged read path: audit schema is intentionally not in the exposed
-- PostgREST schema list, so this public-schema wrapper is the only way an
-- admin/owner can read the log through the client API. SECURITY INVOKER —
-- relies entirely on the RLS policy above, adds no additional privilege.
create or replace function public.list_role_change_audit_log()
returns setof audit.role_changes
language sql
stable
set search_path = ''
as $$
  select * from audit.role_changes order by created_at desc;
$$;

grant execute on function public.list_role_change_audit_log() to authenticated;
revoke all on function public.list_role_change_audit_log() from public, anon;

-- Additive redefinition (same signature) of both role-mutation RPCs to
-- write one audit.role_changes row per successful call, including
-- already-idempotent no-ops (an authorized grant attempt that turned out to
-- be a duplicate is still an auditable authorized action). Every other line
-- of these functions is unchanged from
-- 20260801175838_add_granular_authorization_roles.sql.

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

  insert into audit.role_changes (actor, action, target_user, role, metadata)
  values (caller, 'revoke', target_user, target_role, jsonb_build_object('caller_is_service', caller_is_service));
end;
$$;
