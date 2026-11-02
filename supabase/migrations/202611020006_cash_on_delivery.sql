-- Cash on Delivery has no receipt or prepayment reference. Inventory still decrements atomically.
begin;
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method in ('bank-transfer','easypaisa','jazzcash','cash-on-delivery'));
alter table public.orders alter column slip_path drop not null;

create or replace function public.submit_order(p_order jsonb, p_slip_path text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  line jsonb;
  item public.products%rowtype;
  quantity integer;
  subtotal numeric(12,2) := 0;
  normalized_items jsonb := '[]'::jsonb;
  order_id text;
begin
  if jsonb_typeof(p_order->'items') <> 'array' or jsonb_array_length(p_order->'items') < 1 or jsonb_array_length(p_order->'items') > 30 then
    raise exception 'Invalid order items';
  end if;
  if p_order->>'paymentMethod' <> 'cash-on-delivery' and (length(coalesce(p_slip_path,'')) < 5 or length(p_slip_path) > 250) then raise exception 'Invalid payment slip'; end if;
  if length(trim(coalesce(p_order->'customer'->>'fullName',''))) < 2 or
     length(trim(coalesce(p_order->'customer'->>'phone',''))) < 8 or
     length(trim(coalesce(p_order->'customer'->>'city',''))) < 1 or
     length(trim(coalesce(p_order->'customer'->>'address',''))) < 8 then
    raise exception 'Missing customer details';
  end if;
  if coalesce(p_order->>'paymentMethod','') not in ('bank-transfer','easypaisa','jazzcash','cash-on-delivery') then raise exception 'Invalid payment method'; end if;
  if p_order->>'paymentMethod' <> 'cash-on-delivery' and (length(trim(coalesce(p_order->>'payerName',''))) < 2 or
     length(trim(coalesce(p_order->>'paymentReference',''))) < 4) then raise exception 'Missing payment reference'; end if;
  if p_order->>'paymentMethod' <> 'cash-on-delivery' and not exists (select 1 from public.payment_accounts where method = p_order->>'paymentMethod' and active) then
    raise exception 'Payment method is unavailable';
  end if;
  order_id := 'DF-' || to_char(now() at time zone 'UTC','YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  for line in select value from jsonb_array_elements(p_order->'items') loop
    if coalesce(line->>'id','') = '' or coalesce(line->>'quantity','') !~ '^[1-9][0-9]{0,2}$' then raise exception 'Invalid order line'; end if;
    quantity := (line->>'quantity')::integer;
    select * into item from public.products where id = line->>'id' for update;
    if not found or not item.active then raise exception 'A product is unavailable'; end if;
    if item.stock < quantity then raise exception 'Insufficient stock for %', item.name; end if;
    update public.products set stock = stock - quantity, updated_at = now() where id = item.id;
    subtotal := subtotal + item.price * quantity;
    normalized_items := normalized_items || jsonb_build_array(jsonb_build_object(
      'id',item.id,'sku',item.sku,'name',item.name,'slug',item.slug,
      'quantity',quantity,'unitPrice',item.price,'lineTotal',item.price * quantity
    ));
  end loop;
  insert into public.orders(id,customer_name,email,phone,city,address,payment_method,payer_name,payment_reference,currency,payment_status,subtotal,total,slip_path,items)
  values (order_id, left(p_order->'customer'->>'fullName',120), left(p_order->'customer'->>'email',120),
    left(p_order->'customer'->>'phone',50), left(p_order->'customer'->>'city',80),
    left(p_order->'customer'->>'address',250), p_order->>'paymentMethod',left(p_order->>'payerName',120),
    left(p_order->>'paymentReference',120),'PKR',case when p_order->>'paymentMethod' = 'cash-on-delivery' then 'Payment Pending' else 'Pending Verification' end,subtotal,subtotal,p_slip_path,normalized_items);
  return jsonb_build_object('orderId',order_id,'subtotal',subtotal,'total',subtotal,'items',normalized_items);
end $$;
revoke all on function public.submit_order(jsonb,text) from public, anon, authenticated;
grant execute on function public.submit_order(jsonb,text) to service_role;

create or replace function public.admin_set_order_status(p_order_id text, p_payment_status text, p_order_status text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  existing_order public.orders%rowtype;
  line jsonb;
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid()) then raise exception 'Not authorized'; end if;
  if p_payment_status not in ('Pending Verification','Payment Pending','Verified','Rejected') or
     p_order_status not in ('New','Preparing','Delivered','Cancelled') then raise exception 'Invalid order status'; end if;
  select * into existing_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if p_payment_status = 'Payment Pending' and existing_order.payment_method <> 'cash-on-delivery' then raise exception 'Invalid payment status for online order'; end if;
  if existing_order.stock_released and p_payment_status <> 'Rejected' and p_order_status <> 'Cancelled' then
    raise exception 'A cancelled order cannot be reopened. Create a new order.';
  end if;
  if not existing_order.stock_released and (p_payment_status = 'Rejected' or p_order_status = 'Cancelled') then
    for line in select value from jsonb_array_elements(existing_order.items) loop
      update public.products set stock = stock + (line->>'quantity')::integer, updated_at = now() where id = line->>'id';
    end loop;
    update public.orders set stock_released = true where id = p_order_id;
  end if;
  update public.orders set payment_status = p_payment_status, order_status = p_order_status where id = p_order_id;
end $$;
revoke all on function public.admin_set_order_status(text,text,text) from public, anon;
grant execute on function public.admin_set_order_status(text,text,text) to authenticated;
commit;
