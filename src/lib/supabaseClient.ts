import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from './config';
import type { Database } from './database.types';

let client: SupabaseClient<Database> | null = null;

export const isSupabaseBackendEnabled = () =>
  Boolean(appConfig.supabaseUrl && appConfig.supabasePublishableKey);

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!isSupabaseBackendEnabled()) {
    throw new Error('Supabase backend is not configured.');
  }

  if (!client) {
    client = createClient<Database>(appConfig.supabaseUrl, appConfig.supabasePublishableKey);
  }

  return client;
};
