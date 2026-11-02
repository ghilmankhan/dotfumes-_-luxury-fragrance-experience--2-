-- Older projects may already have applied 006 before these COD fields became nullable.
begin;
alter table public.orders alter column payer_name drop not null;
alter table public.orders alter column payment_reference drop not null;
commit;
