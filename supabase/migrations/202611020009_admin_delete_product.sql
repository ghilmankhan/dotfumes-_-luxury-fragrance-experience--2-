-- Only an authenticated catalog admin may permanently remove a product.
-- Open orders retain a product dependency until delivered or cancelled.
begin;
create or replace function public.admin_delete_product(p_product_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users where user_id = auth.uid()
  ) then raise exception 'Not authorized'; end if;

  perform 1 from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found'; end if;

  if exists (
    select 1 from public.orders o
    cross join lateral jsonb_array_elements(o.items) line
    where line->>'id' = p_product_id and o.order_status not in ('Delivered', 'Cancelled')
  ) then raise exception 'This product is in an open order. Finish or cancel that order first.'; end if;

  delete from public.products where id = p_product_id;
end $$;
revoke all on function public.admin_delete_product(text) from public, anon;
grant execute on function public.admin_delete_product(text) to authenticated;
commit;
