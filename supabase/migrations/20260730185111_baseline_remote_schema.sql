-- Reconstructed baseline for the remote project's combined end state spanning
-- the three missing migration timestamps (`20260730181201`, `20260730181213`,
-- `20260730185111`).
--
-- This file reconstructs the verified combined remote end state as of those
-- three timestamps. Attribution of any individual object below to one
-- specific original migration among the three is unknown and is not
-- claimed anywhere in this file. This file does not reproduce the original
-- three-step DDL history (what was created in which of the three original
-- migrations) — it reproduces only the destination state, once, under this
-- single timestamp.
--
-- It contains only evidence-backed DDL: every object below was independently
-- verified read-only against the remote project (jguewximloxmbhpsoxjb) via
-- `supabase db dump` (09a-remote-public-schema.sql, 09b-remote-private-schema.sql)
-- and targeted read-only introspection queries (12-auth-triggers.txt,
-- 13-event-triggers.txt, 14-default-privileges.txt), all captured in the
-- evidence package for this reconciliation. See
-- 17-reconciliation-matrix.md for the full object-by-object matrix and the
-- reasoning for what is and is not included here.
--
-- Deliberately NOT included (see matrix for detail):
--   * `public.profiles`, its RLS/policies/triggers/grants, and both
--     `auth.users` triggers (`on_auth_user_created`, `on_auth_user_email_updated`)
--     with their backing functions `private.handle_new_user()` /
--     `private.sync_user_email()` — already created by the preserved
--     `20260731174520_add_profiles_foundation.sql`. Reproducing them here
--     would duplicate that migration.
--   * `GRANT USAGE ON SCHEMA public ...` — a Supabase project-bootstrap
--     default present on any fresh project/local stack before any project
--     migration runs (verified unchanged by local Stage A dump comparison).
--   * Any `ALTER DEFAULT PRIVILEGES` for schema `private` — no such row
--     exists in the remote default-ACL evidence (14-default-privileges.txt).
--   * Ownership (`ALTER TABLE/FUNCTION ... OWNER TO`) statements — local
--     `supabase db reset` runs migrations as `postgres`, so newly created
--     objects already match the remote's `postgres` ownership without an
--     explicit statement, consistent with the style of the two preserved
--     migrations.
--
-- NOTE on `public`-schema default privileges: an earlier draft of this file
-- assumed the `public`-schema `ALTER DEFAULT PRIVILEGES` rows (GRANT ALL on
-- SEQUENCES/FUNCTIONS/TABLES to anon/authenticated/service_role, for role
-- postgres) were a platform-bootstrap default identical on any fresh local
-- stack, and omitted them. Stage A local validation
-- (15c-public-baseline.diff) disproved that: a fresh `supabase start` only
-- carries a narrower CLI-bootstrap default for those three roles (partial
-- privileges on sequences/tables, none on functions), not the remote
-- project's full `GRANT ALL`. Without reproducing the remote's default ACL
-- here, `public.profiles` (created later by
-- `20260731174520_add_profiles_foundation.sql`, which grants no explicit
-- table-level privilege to `service_role`) would silently end up with a
-- narrower `service_role` grant locally than remotely. The statements below
-- are therefore evidence-backed (they reproduce exactly what
-- 14-default-privileges.txt and 09a-remote-public-schema.sql show) and
-- locally reproducible/necessary, not platform noise — included per Phase 4
-- item 12's "when evidence and local reproducibility justify them" clause.

-- 1. Required schemas ---------------------------------------------------

create schema if not exists private;

-- 2. Foundational private functions -------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- 3. Tables (+ 4. inline constraints; indexes follow separately) --------

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_name text not null,
  first_name text,
  last_name text,
  phone text not null,
  email text,
  city text,
  address text not null,
  items jsonb not null,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  currency text not null default 'USD',
  payment_method text not null check (payment_method in ('bank-transfer', 'easypaisa', 'jazzcash')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'verified', 'rejected')),
  order_status text not null default 'new' check (order_status in ('new', 'processing', 'delivered', 'cancelled')),
  slip_path text,
  slip_url text,
  whatsapp_message text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  slug text not null unique,
  name text not null,
  description text,
  category text check (category in ('Men', 'Women', 'Unisex')),
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create index orders_created_at_idx on orders using btree (created_at desc);
create index orders_order_status_idx on orders using btree (order_status);
create index orders_payment_status_idx on orders using btree (payment_status);

-- 5. Row-update triggers --------------------------------------------------

create trigger orders_set_updated_at
  before update on orders
  for each row
  execute function private.set_updated_at();

create trigger products_set_updated_at
  before update on products
  for each row
  execute function private.set_updated_at();

create trigger settings_set_updated_at
  before update on settings
  for each row
  execute function private.set_updated_at();

-- 6. RLS enablement ---------------------------------------------------------

alter table orders enable row level security;
alter table products enable row level security;
alter table settings enable row level security;

-- 7. Policies -----------------------------------------------------------

create policy "Admins can read orders"
  on orders for select
  to authenticated
  using ((select private.is_admin()));

create policy "Admins can update orders"
  on orders for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete orders"
  on orders for delete
  to authenticated
  using ((select private.is_admin()));

create policy "Public can read active products"
  on products for select
  to authenticated, anon
  using (active or (select private.is_admin()));

create policy "Admins can insert products"
  on products for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can update products"
  on products for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete products"
  on products for delete
  to authenticated
  using ((select private.is_admin()));

create policy "Public can read public settings"
  on settings for select
  to authenticated, anon
  using (is_public or (select private.is_admin()));

create policy "Admins can insert settings"
  on settings for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can update settings"
  on settings for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins can delete settings"
  on settings for delete
  to authenticated
  using ((select private.is_admin()));

-- 8. Public business functions -------------------------------------------

create or replace function public.create_order(
  p_order_id uuid,
  p_customer jsonb,
  p_items jsonb,
  p_payment_method text,
  p_slip_path text,
  p_whatsapp_message text default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_checkout jsonb;
  v_allow_oos boolean;
  v_delivery_fee numeric(10,2);
  v_currency text;
  v_line_items jsonb := '[]'::jsonb;
  v_subtotal numeric(10,2) := 0;
  v_total numeric(10,2);
  v_item record;
  v_product record;
  v_line_total numeric(10,2);
  v_order_code text;
  v_attempt int;
  v_inserted record;
begin
  select value into v_checkout from public.settings where key = 'checkout';
  v_allow_oos := coalesce((v_checkout->>'allowOutOfStockCheckout')::boolean, false);
  v_delivery_fee := greatest(coalesce((v_checkout->>'deliveryFee')::numeric, 0), 0);
  v_currency := coalesce(nullif(trim(v_checkout->>'currency'), ''), 'USD');

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ITEMS';
  end if;

  -- Sorted by slug so concurrent orders lock product rows in the same order.
  for v_item in
    select elem->>'slug' as slug, (elem->>'quantity')::int as quantity
    from jsonb_array_elements(p_items) elem
    order by elem->>'slug'
  loop
    if v_item.slug is null or v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 20 then
      raise exception 'INVALID_ITEMS';
    end if;

    select id, sku, slug, name, price, stock, active
      into v_product
      from public.products
     where slug = v_item.slug
       for update;

    if not found or v_product.active = false then
      raise exception 'UNAVAILABLE:%', v_item.slug;
    end if;

    if not v_allow_oos and v_product.stock < v_item.quantity then
      raise exception 'OUT_OF_STOCK:%:%', v_product.stock, v_product.name;
    end if;

    update public.products
       set stock = greatest(stock - v_item.quantity, 0)
     where id = v_product.id;

    v_line_total := round(v_product.price * v_item.quantity, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_line_items := v_line_items || jsonb_build_array(jsonb_build_object(
      'id', v_product.id,
      'sku', v_product.sku,
      'name', v_product.name,
      'slug', v_product.slug,
      'quantity', v_item.quantity,
      'unitPrice', v_product.price,
      'lineTotal', v_line_total
    ));
  end loop;

  v_total := round(v_subtotal + v_delivery_fee, 2);

  for v_attempt in 1..5 loop
    v_order_code := 'DF-' || to_char(now() at time zone 'utc', 'YYYYMMDD') || '-' ||
      upper(substr(md5(gen_random_uuid()::text), 1, 5));
    begin
      insert into public.orders (
        id, order_code, customer_name, first_name, last_name, phone, email, city, address,
        items, subtotal, delivery_fee, total, currency, payment_method,
        payment_status, order_status, slip_path, whatsapp_message
      ) values (
        p_order_id,
        v_order_code,
        trim(concat(p_customer->>'firstName', ' ', p_customer->>'lastName')),
        p_customer->>'firstName',
        nullif(p_customer->>'lastName', ''),
        p_customer->>'phone',
        nullif(p_customer->>'email', ''),
        nullif(p_customer->>'city', ''),
        p_customer->>'address',
        v_line_items,
        v_subtotal,
        v_delivery_fee,
        v_total,
        v_currency,
        p_payment_method,
        'pending',
        'new',
        p_slip_path,
        nullif(p_whatsapp_message, '')
      )
      returning id, order_code, created_at into v_inserted;
      exit;
    exception when unique_violation then
      if v_attempt = 5 then
        raise;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'orderUuid', v_inserted.id,
    'orderCode', v_inserted.order_code,
    'createdAt', v_inserted.created_at,
    'subtotal', v_subtotal,
    'deliveryFee', v_delivery_fee,
    'total', v_total,
    'currency', v_currency,
    'items', v_line_items
  );
end;
$$;

-- 9. Auth triggers where evidence confirms them ----------------------------
-- None added here: `on_auth_user_created` and `on_auth_user_email_updated`
-- (and their backing functions) are already created by the preserved
-- `20260731174520_add_profiles_foundation.sql`. See 17-reconciliation-matrix.md.

-- 10. Database event-trigger objects where evidence confirms them ---------

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

-- 11. Explicit grants and revokes ------------------------------------------

grant usage on schema private to authenticated;
grant usage on schema private to anon;

grant all on function private.is_admin() to authenticated;
grant all on function private.is_admin() to anon;

revoke all on function public.create_order(uuid, jsonb, jsonb, text, text, text) from public;
grant all on function public.create_order(uuid, jsonb, jsonb, text, text, text) to service_role;

revoke all on function public.rls_auto_enable() from public;
grant all on function public.rls_auto_enable() to service_role;

grant all on table orders to anon;
grant all on table orders to authenticated;
grant all on table orders to service_role;

grant all on table products to anon;
grant all on table products to authenticated;
grant all on table products to service_role;

grant all on table settings to anon;
grant all on table settings to authenticated;
grant all on table settings to service_role;

-- 12. Default privileges ---------------------------------------------------
-- No default ACL for schema `private` (none evidenced remotely). The
-- `public`-schema default ACLs below are reproduced because Stage A proved
-- they are not already present on a fresh local stack — see the NOTE near
-- the top of this file and 17-reconciliation-matrix.md.

alter default privileges for role postgres in schema public grant all on sequences to anon;
alter default privileges for role postgres in schema public grant all on sequences to authenticated;
alter default privileges for role postgres in schema public grant all on sequences to service_role;

alter default privileges for role postgres in schema public grant all on functions to anon;
alter default privileges for role postgres in schema public grant all on functions to authenticated;
alter default privileges for role postgres in schema public grant all on functions to service_role;

alter default privileges for role postgres in schema public grant all on tables to anon;
alter default privileges for role postgres in schema public grant all on tables to authenticated;
alter default privileges for role postgres in schema public grant all on tables to service_role;
