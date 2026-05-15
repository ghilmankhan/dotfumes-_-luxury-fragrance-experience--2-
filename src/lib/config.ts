const env = import.meta.env;

const trimValue = (value: string | undefined) => {
  const next = value?.trim();
  return next ? next : '';
};

const fallbackWhatsAppNumber = '923001234567';
const fallbackOrderEmail = 'orders@dotfumes.com';

export const appConfig = {
  clientWhatsAppNumber: trimValue(env.VITE_CLIENT_WHATSAPP_NUMBER) || fallbackWhatsAppNumber,
  clientOrderEmail: trimValue(env.VITE_CLIENT_ORDER_EMAIL) || fallbackOrderEmail,
  baseUrl: trimValue(env.VITE_BASE_URL),
  googleAppsScriptWebAppUrl: trimValue(env.VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL),
  orderFormPublicToken: trimValue(env.VITE_ORDER_FORM_PUBLIC_TOKEN),
};
