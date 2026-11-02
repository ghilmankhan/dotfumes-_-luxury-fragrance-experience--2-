-- Let public catalog/payment policies check admin membership without granting table access to visitors.
create or replace function public.is_catalog_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_catalog_admin() from public;
grant execute on function public.is_catalog_admin() to anon, authenticated;

drop policy if exists "Read active products or admin catalog" on public.products;
create policy "Read active products or admin catalog" on public.products
  for select to anon, authenticated using (active or (select public.is_catalog_admin()));

drop policy if exists "Read active payment accounts or admin settings" on public.payment_accounts;
create policy "Read active payment accounts or admin settings" on public.payment_accounts
  for select to anon, authenticated using (active or (select public.is_catalog_admin()));
