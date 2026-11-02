-- NayaPay joins the configurable online payment methods. Details are entered by the admin, not stored in source control.
begin;
alter table public.payment_accounts drop constraint if exists payment_accounts_method_check;
alter table public.payment_accounts add constraint payment_accounts_method_check
  check (method in ('bank-transfer','nayapay','easypaisa','jazzcash'));
insert into public.payment_accounts(method,label) values ('nayapay','NayaPay')
on conflict (method) do nothing;
commit;
