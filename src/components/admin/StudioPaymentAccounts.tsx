import { useState } from 'react';
import { Building2, ChevronDown, CreditCard, Wallet } from 'lucide-react';
import type { PaymentAccount } from '../../lib/paymentAccounts';
import { isGuestOrderSubmissionEnabled } from '../../lib/supabase';

const fieldClass = 'mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition-colors focus:border-[#a78045] focus:ring-2 focus:ring-[#a78045]/15';

type Props = {
  accounts: PaymentAccount[];
  busy: boolean;
  onSave: (account: PaymentAccount) => Promise<void>;
};

const PaymentAccountCard = ({ account, busy, onSave }: { account: PaymentAccount; busy: boolean; onSave: Props['onSave'] }) => {
  const [draft, setDraft] = useState(account);
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<PaymentAccount>) => setDraft((current) => ({ ...current, ...patch }));
  const isBank = draft.method === 'bank-transfer';
  const displayLabel = draft.method === 'easypaisa' ? 'Easypaisa' : draft.method === 'jazzcash' ? 'JazzCash' : draft.label;
  const complete = Boolean(draft.account_title.trim() && (isBank
    ? draft.bank_name.trim() && (draft.account_number.trim() || draft.iban.trim())
    : draft.account_number.trim()));
  const changed = JSON.stringify(draft) !== JSON.stringify(account);
  const status = account.active ? isGuestOrderSubmissionEnabled ? 'Visible at checkout' : 'Ready to enable' : 'Hidden from customers';

  return <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80">
    <button type="button" aria-expanded={open} className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-[#faf8f3] focus-visible:outline-2 focus-visible:outline-[#a78045] sm:px-6" onClick={() => setOpen((value) => !value)}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f5f1e8] text-[#8e6b3b]">{isBank ? <Building2 size={21} strokeWidth={1.7} aria-hidden="true" /> : <Wallet size={21} strokeWidth={1.7} aria-hidden="true" />}</span>
      <span className="min-w-0 flex-1"><span className="block font-semibold text-stone-950">{displayLabel}</span><span className="mt-1 block text-xs text-stone-500">{isBank ? 'Bank transfer' : 'Digital wallet'} · {status}</span></span>
      <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline ${account.active ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{account.active ? 'Active' : 'Hidden'}</span>
      <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-stone-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="border-t border-stone-100 px-5 pb-6 pt-6 sm:px-6">
      <p className="mb-6 max-w-2xl text-sm leading-6 text-stone-600">These are the details customers see when this method is active. Save any changes before leaving this section.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-stone-700">Account title<input className={fieldClass} value={draft.account_title} onChange={(event) => set({ account_title: event.target.value })} placeholder="Name customers will see" /></label>
        {isBank && <label className="text-sm font-medium text-stone-700">Bank name<input className={fieldClass} value={draft.bank_name} onChange={(event) => set({ bank_name: event.target.value })} placeholder="e.g. Bank Alfalah" /></label>}
        <label className="text-sm font-medium text-stone-700">{isBank ? 'Account number' : 'Wallet number'}<input className={fieldClass} value={draft.account_number} onChange={(event) => set({ account_number: event.target.value })} placeholder={isBank ? 'Bank account number' : 'Wallet phone number'} /></label>
        {isBank && <label className="text-sm font-medium text-stone-700">IBAN (optional)<input className={fieldClass} value={draft.iban} onChange={(event) => set({ iban: event.target.value })} placeholder="PK…" /></label>}
        <label className="text-sm font-medium text-stone-700 sm:col-span-2">Instructions for customers (optional)<textarea className={fieldClass} rows={2} value={draft.instructions} onChange={(event) => set({ instructions: event.target.value })} placeholder="Tell customers what to do after transferring" /></label>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#f7f6f2] px-4 py-4"><div><p className="text-sm font-semibold text-stone-950">Show at checkout</p><p className="mt-1 text-xs text-stone-600">Customers can select this method after you save.</p></div><label className="relative inline-flex cursor-pointer items-center"><span className="sr-only">Show {displayLabel} at checkout</span><input type="checkbox" className="peer sr-only" checked={draft.active} disabled={!complete} onChange={(event) => set({ active: event.target.checked })} /><span className="h-7 w-12 rounded-full bg-stone-300 transition-colors peer-checked:bg-[#8d6b3d] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#a78045] peer-disabled:cursor-not-allowed peer-disabled:opacity-50 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" /></label></div>
      {!complete && <p className="mt-3 text-xs text-amber-800">Add the account title and number before making this method visible.</p>}
      <div className="mt-6 flex items-center justify-end gap-4"><span className="text-xs text-stone-500">{changed ? 'Unsaved changes' : 'All changes saved'}</span><button type="button" disabled={busy || !changed || (draft.active && !complete)} className="rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a78045] disabled:cursor-not-allowed disabled:opacity-40" onClick={() => void onSave(draft)}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </div>}
  </div>;
};

export const StudioPaymentAccounts = ({ accounts, busy, onSave }: Props) => <div className="space-y-6">
  <div className="flex items-center gap-3 text-sm text-stone-600"><CreditCard size={18} strokeWidth={1.8} aria-hidden="true" /><span>Enable only the receiving accounts you want customers to use.</span></div>
  {accounts.length === 0 ? <div className="rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-stone-200/80"><p className="font-serif text-xl">No payment methods yet</p><p className="mt-2 text-sm text-stone-600">Payment settings will appear here once configured.</p></div> : <div className="space-y-3">{accounts.map((account) => <PaymentAccountCard key={`${account.method}-${account.active}-${account.account_number}-${account.iban}-${account.instructions}`} account={account} busy={busy} onSave={onSave} />)}</div>}
</div>;
