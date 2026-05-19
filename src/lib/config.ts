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

export const appConfig = {
  clientWhatsAppNumber: trimValue(env.VITE_CLIENT_WHATSAPP_NUMBER) || fallbackWhatsAppNumber,
  clientOrderEmail: trimValue(env.VITE_CLIENT_ORDER_EMAIL) || fallbackOrderEmail,
  baseUrl: trimValue(env.VITE_BASE_URL),
  googleAppsScriptWebAppUrl: firstNonEmpty(
    env.VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL,
    env.VITE_GOOGLE_APPS_SCRIPT_URL,
  ),
  orderFormPublicToken: firstNonEmpty(
    env.VITE_ORDER_FORM_PUBLIC_TOKEN,
    env.VITE_PUBLIC_FORM_TOKEN,
  ),
  adminPassword: trimValue(env.VITE_ADMIN_PASSWORD),
  adminReadToken: trimValue(env.VITE_ADMIN_READ_TOKEN),
};
