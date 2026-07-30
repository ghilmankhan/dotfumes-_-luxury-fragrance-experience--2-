import { getSupabaseClient, isSupabaseBackendEnabled } from './supabaseClient';
import { OrderPayload } from '../models/order';
import { parseBoolean, parseNumber } from './normalize';

export { isSupabaseBackendEnabled };

export type CatalogSettings = {
  hideInactiveProducts: boolean;
  showOutOfStockProducts: boolean;
  allowOutOfStockCheckout: boolean;
  lowStockThreshold: number;
  currency: string;
};

export type CatalogProductRow = {
  productId?: string;
  sku?: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  category?: string;
  lowStock: boolean;
};

export interface ProductCatalogResponse {
  products: CatalogProductRow[];
  settings: CatalogSettings;
}

type SupabaseProductRow = {
  sku: string | null;
  slug: string;
  name: string;
  price: number | string;
  stock: number;
  active: boolean;
  category: string | null;
};

export interface SupabaseOrderResponse {
  success: boolean;
  orderId?: string;
  orderUuid?: string;
  orderCode?: string;
  createdAt?: string;
  message?: string;
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  currency?: string;
  items?: Array<{
    slug: string;
    name?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    sku?: string;
  }>;
}

const defaultCatalogSettings: CatalogSettings = {
  hideInactiveProducts: false,
  showOutOfStockProducts: true,
  allowOutOfStockCheckout: false,
  lowStockThreshold: 3,
  currency: 'USD',
};

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

export const fetchProductCatalogFromSupabase = async (): Promise<ProductCatalogResponse> => {
  const supabase = getSupabaseClient();

  const [productsResult, settingsResult] = await Promise.all([
    supabase
      .from('products')
      .select('sku, slug, name, price, stock, active, category')
      .order('created_at', { ascending: true }),
    supabase.from('settings').select('value').eq('key', 'checkout').maybeSingle(),
  ]);

  if (productsResult.error) {
    throw new Error('Unable to fetch product inventory right now.', {
      cause: productsResult.error,
    });
  }

  const checkout =
    settingsResult.data?.value && typeof settingsResult.data.value === 'object'
      ? (settingsResult.data.value as Record<string, unknown>)
      : {};

  const settings: CatalogSettings = {
    hideInactiveProducts: parseBoolean(checkout.hideInactiveProducts, false),
    showOutOfStockProducts: parseBoolean(checkout.showOutOfStockProducts, true),
    allowOutOfStockCheckout: parseBoolean(checkout.allowOutOfStockCheckout, false),
    lowStockThreshold: parseNumber(checkout.lowStockThreshold, 3),
    currency:
      typeof checkout.currency === 'string' && checkout.currency.trim()
        ? checkout.currency.trim()
        : defaultCatalogSettings.currency,
  };

  const products: CatalogProductRow[] = ((productsResult.data ?? []) as SupabaseProductRow[]).map(
    (row) => {
      const stock = Math.max(0, Math.floor(parseNumber(row.stock, 0)));
      return {
        slug: row.slug,
        name: row.name,
        price: parseNumber(row.price, 0),
        stock,
        active: row.active,
        lowStock: stock > 0 && stock <= settings.lowStockThreshold,
        ...(row.sku ? { productId: row.sku, sku: row.sku } : {}),
        ...(row.category ? { category: row.category } : {}),
      };
    },
  );

  return { products, settings };
};

export const submitOrderToSupabase = async (params: {
  order: OrderPayload;
  slipFile: File;
  honeypot: string;
}): Promise<SupabaseOrderResponse> => {
  const { order, slipFile, honeypot } = params;
  const supabase = getSupabaseClient();

  const slipBase64 = await readFileAsBase64(slipFile);

  const { data, error } = await supabase.functions.invoke<SupabaseOrderResponse>('create-order', {
    body: {
      honeypot,
      paymentMethod: order.paymentMethod,
      whatsappMessage: order.whatsappMessage,
      customer: {
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address,
        city: order.customer.city,
      },
      items: order.items.map((item) => ({
        slug: item.slug,
        quantity: item.quantity,
      })),
      slip: {
        fileName: slipFile.name,
        mimeType: slipFile.type,
        base64: slipBase64,
      },
    },
  });

  if (error) {
    let message = 'Unable to submit your order right now. Please try again.';
    if ('context' in error && error.context instanceof Response) {
      try {
        const details = (await error.context.json()) as SupabaseOrderResponse;
        if (details?.message) {
          message = details.message;
        }
      } catch {
        // keep generic message
      }
    }
    throw new Error(message, { cause: error });
  }

  if (!data?.success) {
    throw new Error(data?.message || 'Order submission failed. Please try again.');
  }

  return data;
};
