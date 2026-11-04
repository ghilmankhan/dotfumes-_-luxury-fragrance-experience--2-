-- Product media metadata; original masters are immutable and never automatically deleted.
begin;

-- Existing catalog administrators receive the trusted Auth app_metadata claim.
-- Already-issued JWTs must be refreshed before the new media endpoints are used.
update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where exists (select 1 from public.admin_users a where a.user_id = u.id)
  and u.raw_app_meta_data->>'role' is distinct from 'admin';

create or replace function public.is_image_admin()
returns boolean language sql stable set search_path = public, pg_temp as $$
  select coalesce((auth.jwt()->'app_metadata'->>'role') = 'admin', false);
$$;
revoke all on function public.is_image_admin() from public;
grant execute on function public.is_image_admin() to anon, authenticated;

create table if not exists public.product_images (
  id uuid primary key,
  product_id text not null references public.products(id) on delete cascade,
  original_url text not null,
  original_path text,
  original_mime text,
  original_width integer check (original_width between 1 and 8000),
  original_height integer check (original_height between 1 and 8000),
  original_bytes integer check (original_bytes between 1 and 5242880),
  variants jsonb not null default '{}'::jsonb check (jsonb_typeof(variants) = 'object'),
  slot text not null default 'lifestyle' check (slot in ('front','angle','flatLay','lifestyle')),
  position integer not null check (position >= 0),
  is_primary boolean not null default false,
  alt_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_images_original_path_shape check (original_path is null or original_path ~ '^[0-9a-f-]{36}/original/[0-9a-f-]{36}[.](jpg|png|webp)$')
);
create unique index if not exists product_images_one_primary on public.product_images(product_id) where is_primary;
create unique index if not exists product_images_unique_position on public.product_images(product_id, position);
create index if not exists product_images_order on public.product_images(product_id, position);

create or replace function public.assert_product_primary_image()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare v_product_id text;
begin
  v_product_id := coalesce(new.product_id, old.product_id);
  if exists (select 1 from public.products where id = v_product_id) and
    (select count(*) from public.product_images where product_id = v_product_id and is_primary) <> 1 then
    raise exception 'Exactly one primary image is required for product %', v_product_id;
  end if;
  return null;
end $$;
create constraint trigger product_primary_image_required
  after insert or update or delete on public.product_images
  deferrable initially deferred for each row execute function public.assert_product_primary_image();
create or replace function public.assert_product_has_primary_image()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if (select count(*) from public.product_images where product_id = new.id and is_primary) <> 1 then
    raise exception 'Exactly one primary image is required for product %', new.id;
  end if;
  return null;
end $$;
create constraint trigger product_has_primary_image
  after insert or update on public.products
  deferrable initially deferred for each row execute function public.assert_product_has_primary_image();

alter table public.product_images enable row level security;
revoke all on public.product_images from anon, authenticated;
grant select on public.product_images to anon, authenticated;
create policy "Public images of active products or image admin" on public.product_images
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and (p.active or (select public.is_image_admin())))
  );

-- Preserve current rows and paths; legacy assets do not claim a Storage original path.
insert into public.product_images(id, product_id, original_url, slot, position, is_primary, alt_text)
select gen_random_uuid(), p.id, i.url, i.slot, i.position, i.position = 0,
       p.name || case when i.slot = 'front' then ' perfume bottle front view' when i.slot = 'angle' then ' perfume bottle angle view' when i.slot = 'flatLay' then ' perfume bottle flat lay' else ' perfume lifestyle photograph' end
from public.products p
cross join lateral (
  select value as url, case when ordinality = 1 then 'front' when ordinality = 2 then 'angle' when ordinality = 3 then 'flatLay' else 'lifestyle' end as slot,
         (ordinality - 1)::integer as position
  from jsonb_array_elements_text(jsonb_build_array(p.images->>'front', p.images->>'angle', p.images->>'flatLay') || coalesce(p.images->'lifestyle','[]'::jsonb)) with ordinality
  where value <> ''
) i
where not exists (select 1 from public.product_images pi where pi.product_id = p.id);

-- This RPC is the only client-side catalog write path for a complete product + gallery.
create or replace function public.admin_save_product_with_images(p_product jsonb, p_images jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id text;
  v_count integer;
  v_primary_count integer;
  v_front text;
  v_angle text := '';
  v_flatlay text := '';
  v_lifestyle jsonb := '[]'::jsonb;
  v_item jsonb;
  v_url text;
begin
  if not public.is_image_admin() then raise exception 'Not authorized'; end if;
  if jsonb_typeof(p_product) <> 'object' or jsonb_typeof(p_images) <> 'array' then raise exception 'Invalid product image payload'; end if;
  v_id := p_product->>'id';
  if v_id is null or length(v_id) < 1 or length(v_id) > 100 then raise exception 'Invalid product id'; end if;
  v_count := jsonb_array_length(p_images);
  if v_count < 1 or v_count > 30 then raise exception 'A product needs 1 to 30 images'; end if;
  select count(*) into v_primary_count from jsonb_array_elements(p_images) x where x->>'is_primary' = 'true';
  if v_primary_count <> 1 then raise exception 'Exactly one primary image is required'; end if;
  select x->>'original_url' into v_front from jsonb_array_elements(p_images) x where x->>'is_primary' = 'true';
  if v_front is null or length(v_front) < 1 then raise exception 'Primary image URL is required'; end if;

  for v_item in select value from jsonb_array_elements(p_images) loop
    v_url := v_item->>'original_url';
    if v_url is null or length(v_url) < 1 or length(v_url) > 2048 or
       (v_item->>'slot') not in ('front','angle','flatLay','lifestyle') or
       jsonb_typeof(coalesce(v_item->'variants','{}'::jsonb)) <> 'object' then
      raise exception 'Invalid image metadata';
    end if;
    if v_item->>'is_primary' <> 'true' then
      if v_item->>'slot' = 'angle' and v_angle = '' then v_angle := v_url;
      elsif v_item->>'slot' = 'flatLay' and v_flatlay = '' then v_flatlay := v_url;
      else v_lifestyle := v_lifestyle || to_jsonb(v_url); end if;
    end if;
  end loop;

  insert into public.products(id, sku, slug, name, price, size_ml, stock, category, active, featured, description, short_description, images, notes, sort_order)
  values (v_id, p_product->>'sku', p_product->>'slug', p_product->>'name', (p_product->>'price')::numeric,
    nullif(p_product->>'size_ml','')::integer, (p_product->>'stock')::integer, p_product->>'category',
    (p_product->>'active')::boolean, coalesce((p_product->>'featured')::boolean,false),
    coalesce(p_product->>'description',''), coalesce(p_product->>'short_description',''),
    jsonb_build_object('front',v_front,'angle',v_angle,'flatLay',v_flatlay,'lifestyle',v_lifestyle),
    coalesce(p_product->'notes','{"top":[],"heart":[],"base":[]}'::jsonb), coalesce((p_product->>'sort_order')::integer,100))
  on conflict (id) do update set sku=excluded.sku, slug=excluded.slug, name=excluded.name,
    price=excluded.price, size_ml=excluded.size_ml, stock=excluded.stock, category=excluded.category,
    active=excluded.active, featured=excluded.featured, description=excluded.description,
    short_description=excluded.short_description, images=excluded.images, notes=excluded.notes,
    sort_order=excluded.sort_order, updated_at=now();

  delete from public.product_images where product_id = v_id;
  insert into public.product_images(id, product_id, original_url, original_path, original_mime, original_width, original_height, original_bytes, variants, slot, position, is_primary, alt_text)
  select (x.value->>'id')::uuid, v_id, x.value->>'original_url', nullif(x.value->>'original_path',''),
    nullif(x.value->>'original_mime',''), nullif(x.value->>'original_width','')::integer,
    nullif(x.value->>'original_height','')::integer, nullif(x.value->>'original_bytes','')::integer,
    coalesce(x.value->'variants','{}'::jsonb), x.value->>'slot', (x.ordinality - 1)::integer,
    (x.value->>'is_primary')::boolean, coalesce(x.value->>'alt_text','')
  from jsonb_array_elements(p_images) with ordinality x;
end $$;
revoke all on function public.admin_save_product_with_images(jsonb,jsonb) from public, anon;
grant execute on function public.admin_save_product_with_images(jsonb,jsonb) to authenticated;

-- New direct browser uploads are disabled. Uploads are validated by the image Edge Function.
drop policy if exists "Admin product image upload" on storage.objects;
drop policy if exists "Admin product image update" on storage.objects;
revoke insert, update on public.products from authenticated;
-- No DELETE policy is granted. Masters can only be retained; variant cleanup is server-only.

commit;
