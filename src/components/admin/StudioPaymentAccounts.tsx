import { useState } from 'react';
import type { PaymentAccount } from '../../lib/paymentAccounts';
import { isGuestOrderSubmissionEnabled } from '../../lib/supabase';

const fieldClass = 'mt-2 w-full rounded-md border border-stone-200 bg-white px-3.5 py-3 text-sm text-stone-900 outline-none focus:border-[#a78045] focus:ring-2 focus:ring-[#a78045]/15';

type Props = {
  accounts: PaymentAccount[];
  busy: boolean;
  onSave: (account: PaymentAccount) => Promise<void>;
};

const PaymentAccountCard = ({ account, busy, onSave }: { account: PaymentAccount; busy: boolean; onSave: Props['onSave'] }) => {
  const [draft, setDraft] = useState(account);
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<PaymentAccount>) => setDraft((current) => ({ ...current, ...patch }));
  const complete = Boolean(draft.account_title.trim() && (draft.method === 'bank-transfer'
    ? draft.bank_name.trim() && (draft.account_number.trim() || draft.iban.trim())
    : draft.account_number.trim()));

  return <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-center justify-between gap-4"><div><h3 className="font-serif text-2xl text-stone-900">{draft.label}</h3><p className="mt-1 text-xs text-stone-500">{draft.active ? isGuestOrderSubmissionEnabled ? 'Visible at checkout' : 'Ready for checkout launch' : 'Not shown to customers'}</p></div><button className="rounded-md border border-stone-200 px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50" onClick={() => setOpen((value) => !value)}>{open ? 'Close' : 'Edit details'}</button></div>
    {open && <div className="mt-6 grid gap-5 border-t border-stone-100 pt-6 sm:grid-cols-2">
      <label className="text-sm font-medium text-stone-700">Account title<input className={fieldClass} value={draft.account_title} onChange={(event) => set({ account_title: event.target.value })} placeholder="Name customers will see" /></label>
      {draft.method === 'bank-transfer' && <label className="text-sm font-medium text-stone-700">Bank name<input className={fieldClass} value={draft.bank_name} onChange={(event) => set({ bank_name: event.target.value })} /></label>}
      <label className="text-sm font-medium text-stone-700">{draft.method === 'bank-transfer' ? 'Account number' : 'Wallet number'}<input className={fieldClass} value={draft.account_number} onChange={(event) => set({ account_number: event.target.value })} /></label>
      {draft.method === 'bank-transfer' && <label className="text-sm font-medium text-stone-700">IBAN (optional)<input className={fieldClass} value={draft.iban} onChange={(event) => set({ iban: event.target.value })} /></label>}
      <label className="text-sm font-medium text-stone-700 sm:col-span-2">Customer instructions (optional)<textarea className={fieldClass} rows={2} value={draft.instructions} onChange={(event) => set({ instructions: event.target.value })} placeholder="e.g. Include your order number in the transfer note" /></label>
      <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2"><input type="checkbox" className="accent-[#a78045]" checked={draft.active} disabled={!complete} onChange={(event) => set({ active: event.target.checked })} />Show this payment method at checkout</label>
      {!complete && <p className="text-xs text-amber-800 sm:col-span-2">Add receiving details before enabling this method. Demo details stay hidden from customers.</p>}
      <div className="sm:col-span-2"><button disabled={busy || (draft.active && !complete)} className="rounded-md bg-stone-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50" onClick={() => void onSave(draft)}>{busy ? 'Saving…' : 'Save payment details'}</button></div>
    </div>}
  </div>;
};

export const StudioPaymentAccounts = ({ accounts, busy, onSave }: Props) => <div className="space-y-4">
  <div><h2 className="font-serif text-3xl text-stone-900">Payment accounts</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Manage bank transfer, NayaPay, Easypaisa and JazzCash here. Customers only see methods you enable.</p></div>
  {accounts.map((account) => <PaymentAccountCard key={account.method} account={account} busy={busy} onSave={onSave} />)}
  {accounts.length === 0 && <p className="rounded-lg bg-white p-6 text-sm text-stone-600">Payment methods are not configured yet.</p>}
</div>;
