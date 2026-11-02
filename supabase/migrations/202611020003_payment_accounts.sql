-- Receiving accounts are managed by authenticated admins. Only enabled, complete accounts are public.
create table if not exists public.payment_accounts (
  method text primary key check (method in ('bank-transfer', 'easypaisa', 'jazzcash')),
  label text not null,
  account_title text not null default '',
  bank_name text not null default '',
  account_number text not null default '',
  iban text not null default '',
  instructions text not null default '',
  active boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint payment_account_complete check (
    not active or (length(trim(account_title)) > 0 and
      (case when method = 'bank-transfer' then length(trim(bank_name)) > 0 and (length(trim(account_number)) > 0 or length(trim(iban)) > 0)
       else length(trim(account_number)) > 0 end))
  )
);
alter table public.payment_accounts enable row level security;
revoke all on public.payment_accounts from anon, authenticated;
grant select on public.payment_accounts to anon, authenticated;
grant update on public.payment_accounts to authenticated;
create policy "Read active payment accounts or admin settings" on public.payment_accounts
  for select to anon, authenticated using (
    active or exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  );
create policy "Admin updates payment accounts" on public.payment_accounts
  for update to authenticated using (
    exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  );
insert into public.payment_accounts(method, label) values
  ('bank-transfer', 'Bank transfer'),
  ('easypaisa', 'Easypaisa'),
  ('jazzcash', 'JazzCash')
on conflict (method) do nothing;
