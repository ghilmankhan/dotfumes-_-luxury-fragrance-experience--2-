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
      quantitySummary: order.items.map((item) => `${item.name} x${item.quantity}`).join(', '),
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
