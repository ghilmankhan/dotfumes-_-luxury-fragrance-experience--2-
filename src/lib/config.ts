const env = import.meta.env;

const trimValue = (value: string | undefined) => {
  const next = value?.trim();
  return next ? next : '';
};

const firstNonEmpty = (...values: Array<string | undefined>) => {
  for (const value of values) {
    const next = trimValue(value);
    if (next) {
      return next;
    }
  }

  return '';
};

const fallbackWhatsAppNumber = '923001234567';
const fallbackOrderEmail = 'orders@dotfumes.com';
const configuredWhatsAppNumber = trimValue(env.VITE_CLIENT_WHATSAPP_NUMBER);
const configuredOrderEmail = trimValue(env.VITE_CLIENT_ORDER_EMAIL);

export const appConfig = {
  clientWhatsAppNumber: configuredWhatsAppNumber || fallbackWhatsAppNumber,
  clientOrderEmail: configuredOrderEmail || fallbackOrderEmail,
  hasConfiguredWhatsAppNumber: Boolean(configuredWhatsAppNumber),
  hasConfiguredOrderEmail: Boolean(configuredOrderEmail),
  baseUrl: trimValue(env.VITE_BASE_URL),
  supabaseUrl: trimValue(env.VITE_SUPABASE_URL),
  supabasePublishableKey: firstNonEmpty(
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    env.VITE_SUPABASE_ANON_KEY,
  ),
};

// Dev-only startup validation (Base Phase 4 — "validation of required
// frontend environment variables"). Never throws: a missing/partial
// Supabase config is handled everywhere via isSupabaseBackendEnabled()
// (src/lib/supabaseClient.ts), which is a deliberate soft-fail, not a hard
// requirement to boot. These are console warnings only, to surface likely
// mistakes early without changing runtime behavior, and only run in dev
// builds (import.meta.env.DEV) so they never reach a production console.
if (import.meta.env.DEV) {
  const hasUrl = Boolean(appConfig.supabaseUrl);
  const hasKey = Boolean(appConfig.supabasePublishableKey);

  if (hasUrl !== hasKey) {
    console.warn(
      '[config] VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must both be set or both left ' +
        'empty — exactly one is set, which isSupabaseBackendEnabled() treats as "disabled". See ' +
        '.env.example.',
    );
  }

  if (hasUrl && !/^https?:\/\//i.test(appConfig.supabaseUrl)) {
    console.warn(
      `[config] VITE_SUPABASE_URL ("${appConfig.supabaseUrl}") does not look like a URL ` +
        '(expected it to start with http:// or https://).',
    );
  }

  // Defense in depth: no privileged Supabase key should ever be given a
  // VITE_ prefix (see .env.example and 04-environment-variable-inventory.md
  // — anything VITE_-prefixed is bundled into the browser). This cannot
  // catch a key added under a non-VITE_ name (Vite would not expose it to
  // import.meta.env at all, which is the point), only a VITE_-prefixed one.
  const suspiciousKeyPattern = /service_role|secret/i;
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith('VITE_') && suspiciousKeyPattern.test(name) && trimValue(value as string)) {
      console.warn(
        `[config] "${name}" looks like a privileged Supabase key but has a VITE_ prefix, which ` +
          'bundles it into browser code. Remove the VITE_ prefix and use it only from a trusted ' +
          'server context.',
      );
    }
  }
}
