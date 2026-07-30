import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from './config';

let client: SupabaseClient | null = null;

export const isSupabaseBackendEnabled = () =>
  Boolean(appConfig.supabaseUrl && appConfig.supabasePublishableKey);

export const getSupabaseClient = (): SupabaseClient => {
  if (!isSupabaseBackendEnabled()) {
    throw new Error('Supabase backend is not configured.');
  }

  if (!client) {
    client = createClient(appConfig.supabaseUrl, appConfig.supabasePublishableKey);
  }

  return client;
};
