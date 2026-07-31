-- Foundation identity table: one row per authenticated user.
-- No auth secrets (passwords, tokens) are duplicated here; auth.users
-- remains the sole source of truth for login credentials.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per authenticated user, auto-provisioned on signup via private.handle_new_user(). '
  'email is duplicated from auth.users purely for convenient display/joins and is kept in sync '
  'by private.sync_user_email(); auth.users stays authoritative for login/credentials.';

alter table public.profiles enable row level security;

-- Deny-by-default: RLS is on and no policy exists yet for anon, so anon has
-- zero access. Two narrow policies below cover the only sanctioned access
-- pattern for this foundation stage (a user reading/updating their own row).
-- Staff/admin-wide read access is deliberately NOT added yet — no feature
-- consumes it today, and app_metadata-based admin checks (private.is_admin())
-- already gate every existing admin surface; adding a redundant policy here
-- with no caller would be premature scaffolding.

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- Column-level grants: a user may change full_name/phone but never id
-- (identity key), email (kept in sync from auth.users, not user-editable
-- here), or created_at.
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, updated_at) on public.profiles to authenticated;

-- Reuses the existing private.set_updated_at() trigger function (already
-- present in this project, used by other tables) for consistency.
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function private.set_updated_at();

-- Auto-provision a profile on signup. SECURITY DEFINER is required because
-- the new user has no session yet at insert time and could not otherwise
-- satisfy an INSERT policy on profiles; scope is deliberately narrow (fixed
-- empty search_path, RETURNS TRIGGER so it cannot be invoked directly as a
-- callable function/endpoint, only fired by the trigger below).
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- Keep profiles.email in sync if a user changes their login email via
-- Supabase Auth, since profiles.email is not directly user-editable.
create or replace function private.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email, updated_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  execute function private.sync_user_email();
