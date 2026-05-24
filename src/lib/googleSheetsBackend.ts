import { appConfig } from './config';
import { OrderPayload, GoogleAppsScriptOrderResponse } from '../models/order';

const ORDER_REQUEST_TIMEOUT_MS = 22000;

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unable to read payment slip file.'));
        return;
      }

      const base64 = result.includes(',') ? result.split(',')[1] : result;
      if (!base64) {
        reject(new Error('Payment slip file is empty.'));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the payment slip file.'));
    };

    reader.readAsDataURL(file);
  });

const parseAppsScriptResponse = (raw: string): GoogleAppsScriptOrderResponse => {
  if (!raw.trim()) {
    throw new Error('Empty response from order service.');
  }

  const parsed = JSON.parse(raw) as GoogleAppsScriptOrderResponse;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid response from order service.');
  }

  return parsed;
};

type GoogleSheetsFrontendSettings = {
  sheetProductDatabase: boolean;
  hideInactiveProducts: boolean;
  showOutOfStockProducts: boolean;
  allowOutOfStockCheckout: boolean;
  lowStockThreshold: number;
  currency: string;
};

type GoogleSheetsProductRow = {
  productId?: string;
  sku?: string;
  slug?: string;
  name?: string;
  price?: number;
  stock?: number;
  active?: boolean;
  category?: string;
  lowStock?: boolean;
};

type ProductCatalogResponse = {
  products: GoogleSheetsProductRow[];
  settings: GoogleSheetsFrontendSettings;
};

const defaultCatalogSettings: GoogleSheetsFrontendSettings = {
  sheetProductDatabase: false,
  hideInactiveProducts: false,
  showOutOfStockProducts: true,
  allowOutOfStockCheckout: false,
  lowStockThreshold: 3,
  currency: 'USD',
};

const sanitizeBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const next = value.trim().toLowerCase();
    if (next === 'true' || next === '1' || next === 'yes') {
      return true;
    }
    if (next === 'false' || next === '0' || next === 'no') {
      return false;
    }
  }
  return fallback;
};

const sanitizeNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const toCatalogResponse = (payload: unknown): ProductCatalogResponse => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid products response from order service.');
  }

  const envelope = payload as Record<string, unknown>;
  const data = (envelope.data && typeof envelope.data === 'object'
    ? envelope.data
    : envelope) as Record<string, unknown>;

  const rawProducts = Array.isArray(data.products) ? data.products : [];
  const rawSettings =
    data.settings && typeof data.settings === 'object'
      ? (data.settings as Record<string, unknown>)
      : {};

  const products = rawProducts
    .map((row) => (row && typeof row === 'object' ? (row as GoogleSheetsProductRow) : null))
    .filter((row): row is GoogleSheetsProductRow => Boolean(row));

  const settings: GoogleSheetsFrontendSettings = {
    sheetProductDatabase: sanitizeBoolean(rawSettings.sheetProductDatabase, false),
    hideInactiveProducts: sanitizeBoolean(rawSettings.hideInactiveProducts, false),
    showOutOfStockProducts: sanitizeBoolean(rawSettings.showOutOfStockProducts, true),
    allowOutOfStockCheckout: sanitizeBoolean(rawSettings.allowOutOfStockCheckout, false),
    lowStockThreshold: sanitizeNumber(rawSettings.lowStockThreshold, 3),
    currency:
      typeof rawSettings.currency === 'string' && rawSettings.currency.trim()
        ? rawSettings.currency.trim()
        : 'USD',
  };

  return { products, settings };
};

const createTimeoutSignal = () => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => {
    controller.abort();
  }, ORDER_REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timer),
  };
};

export const isGoogleSheetsBackendEnabled = () => Boolean(appConfig.googleAppsScriptWebAppUrl);

export const fetchProductCatalogFromGoogleSheets = async (): Promise<ProductCatalogResponse> => {
  if (!appConfig.googleAppsScriptWebAppUrl) {
    return { products: [], settings: defaultCatalogSettings };
  }

  const separator = appConfig.googleAppsScriptWebAppUrl.includes('?') ? '&' : '?';
  const url = `${appConfig.googleAppsScriptWebAppUrl}${separator}action=products`;

  const timeout = createTimeoutSignal();

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: timeout.signal,
    });

    const raw = await response.text();
    if (!raw.trim()) {
      throw new Error('Empty products response from order service.');
    }

    const parsed = JSON.parse(raw) as unknown;
    const catalog = toCatalogResponse(parsed);

    if (!response.ok) {
      throw new Error('Unable to fetch product inventory right now.');
    }

    return catalog;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Product inventory request timed out. Please try again.', { cause: error });
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unable to fetch product inventory right now.', { cause: error });
  } finally {
    timeout.clear();
  }
};

export type { GoogleSheetsFrontendSettings, ProductCatalogResponse, GoogleSheetsProductRow };

export const submitOrderToGoogleSheets = async (params: {
  order: OrderPayload;
  slipFile: File;
  honeypot: string;
}) => {
  const { order, slipFile, honeypot } = params;

  if (!appConfig.googleAppsScriptWebAppUrl) {
    throw new Error('Order endpoint is not configured.');
  }

  const slipBase64 = await readFileAsBase64(slipFile);

  const payload = {
    token: appConfig.orderFormPublicToken,
    honeypot,
    order: {
      orderId: order.orderId,
      createdAt: order.createdAt,
      customerName: order.customer.fullName,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      phone: order.customer.phone,
      email: order.customer.email,
      city: order.customer.city,
      address: order.customer.address,
      products: order.items,
      quantitySummary: order.items
        .map((item) => `${item.name}${item.sku ? ` (${item.sku})` : ''} x${item.quantity}`)
        .join(', '),
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      whatsappMessage: order.whatsappMessage,
      adminNotes: '',
    },
    slip: {
      fileName: slipFile.name,
      mimeType: slipFile.type,
      fileSize: slipFile.size,
      base64: slipBase64,
    },
  };

  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));

  const timeout = createTimeoutSignal();

  try {
    const response = await fetch(appConfig.googleAppsScriptWebAppUrl, {
      method: 'POST',
      body: formData,
      signal: timeout.signal,
    });

    const raw = await response.text();
    const result = parseAppsScriptResponse(raw);

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Order submission failed. Please try again.');
    }

    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Order submission timed out. Please try again.', { cause: error });
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unable to submit your order right now. Please try again.', { cause: error });
  } finally {
    timeout.clear();
  }
};
