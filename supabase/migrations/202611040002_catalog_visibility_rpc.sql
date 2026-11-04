-- Preserve the existing Hide action after direct product writes move into the gallery RPC.
begin;
create or replace function public.admin_set_product_visibility(p_product_id text, p_active boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Not authorized';
  end if;
  update public.products set active = p_active, updated_at = now() where id = p_product_id;
  if not found then raise exception 'Product not found'; end if;
end $$;
revoke all on function public.admin_set_product_visibility(text,boolean) from public, anon;
grant execute on function public.admin_set_product_visibility(text,boolean) to authenticated;
commit;
