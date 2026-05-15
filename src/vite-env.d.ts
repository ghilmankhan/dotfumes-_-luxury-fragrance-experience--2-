/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIENT_WHATSAPP_NUMBER?: string;
  readonly VITE_CLIENT_ORDER_EMAIL?: string;
  readonly VITE_BASE_URL?: string;
  readonly VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL?: string;
  readonly VITE_ORDER_FORM_PUBLIC_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
