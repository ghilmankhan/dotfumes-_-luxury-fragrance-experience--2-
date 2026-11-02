import type { PaymentMethod } from '../models/order';
import { supabase } from './supabase';

export interface PaymentAccount {
  method: PaymentMethod;
  label: string;
  account_title: string;
  bank_name: string;
  account_number: string;
  iban: string;
  instructions: string;
  active: boolean;
}

const isMethod = (value: unknown): value is PaymentMethod =>
  value === 'bank-transfer' || value === 'nayapay' || value === 'easypaisa' || value === 'jazzcash';

const parseAccount = (value: unknown): PaymentAccount | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (!isMethod(row.method) || typeof row.label !== 'string' ||
      typeof row.account_title !== 'string' || typeof row.bank_name !== 'string' ||
      typeof row.account_number !== 'string' || typeof row.iban !== 'string' ||
      typeof row.instructions !== 'string' || typeof row.active !== 'boolean') return null;
  return row as unknown as PaymentAccount;
};

export const fetchPaymentAccounts = async (): Promise<PaymentAccount[]> => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('payment_accounts').select('method,label,account_title,bank_name,account_number,iban,instructions,active');
  if (error) throw error;
  const accounts = (data ?? []).map(parseAccount);
  if (accounts.some((account) => !account)) throw new Error('Payment account settings are invalid.');
  return accounts as PaymentAccount[];
};

export const savePaymentAccount = async (account: PaymentAccount) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('payment_accounts').update({
    account_title: account.account_title.trim(), bank_name: account.bank_name.trim(),
    account_number: account.account_number.trim(), iban: account.iban.trim(),
    instructions: account.instructions.trim(), active: account.active,
    updated_at: new Date().toISOString(),
  }).eq('method', account.method).select('method').single();
  if (error) throw error;
  if (!data) throw new Error('Payment method was not saved.');
};
