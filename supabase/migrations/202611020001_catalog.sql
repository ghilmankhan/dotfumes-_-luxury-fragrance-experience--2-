-- Dotfumes catalog. Apply in a new Supabase project before seeding products.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.products (
  id text primary key,
  sku text not null unique,
  slug text not null unique,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  size_ml integer check (size_ml > 0),
  stock integer not null default 0 check (stock >= 0),
  category text not null check (category in ('Men', 'Women', 'Unisex')),
  active boolean not null default false,
  featured boolean not null default false,
  description text not null default '',
  short_description text not null default '',
  images jsonb not null default '{"front":"","angle":"","flatLay":"","lifestyle":[]}'::jsonb,
  notes jsonb not null default '{"top":[],"heart":[],"base":[]}'::jsonb,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint product_images_shape check (jsonb_typeof(images) = 'object' and jsonb_typeof(images->'lifestyle') = 'array'),
  constraint product_notes_shape check (jsonb_typeof(notes) = 'object' and jsonb_typeof(notes->'top') = 'array' and jsonb_typeof(notes->'heart') = 'array' and jsonb_typeof(notes->'base') = 'array')
);
create index if not exists products_active_sort_idx on public.products(active, sort_order);
create unique index if not exists products_sku_case_unique on public.products(lower(sku));
create unique index if not exists products_slug_case_unique on public.products(lower(slug));

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
revoke all on public.admin_users from anon, authenticated;
revoke all on public.products from anon, authenticated;
grant select on public.admin_users to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update on public.products to authenticated;
create policy "Read own admin membership" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
create policy "Read active products or admin catalog" on public.products for select to anon, authenticated using (
  active or exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "Admin inserts products" on public.products for insert to authenticated with check (
  exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "Admin updates products" on public.products for update to authenticated using (
  exists (select 1 from public.admin_users where user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "Public product image read" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy "Admin product image upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "Admin product image update" on storage.objects for update to authenticated using (
  bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
) with check (
  bucket_id = 'product-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
