import {
  OrderDraft,
  OrderPayload,
  OrderSubmissionMode,
  OrderSubmissionResult,
} from '../models/order';
import { buildOrderPayload, buildWhatsAppMessage, createOrderId } from '../lib/order';
import { isGoogleSheetsBackendEnabled, submitOrderToGoogleSheets } from '../lib/googleSheetsBackend';
import { getCartAvailabilityIssues, getCartAvailabilityMessage } from '../lib/validation';
import { Product } from '../models/types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface OrderSubmissionService {
  submit(draft: OrderDraft): Promise<OrderSubmissionResult>;
}

const buildOrderFromDraft = (draft: OrderDraft, mode: OrderSubmissionMode): OrderPayload =>
  buildOrderPayload({
    orderId: draft.orderId ?? createOrderId(),
    values: draft.values,
    cartItems: draft.cartItems,
    slipFile: draft.slip.file,
    ...(draft.slip.previewUrl ? { slipPreviewUrl: draft.slip.previewUrl } : {}),
    submissionMode: mode,
  });

const ensureCartAvailability = (draft: OrderDraft, products: Product[], allowOutOfStockCheckout: boolean) => {
  if (allowOutOfStockCheckout) {
    return;
  }

  const issues = getCartAvailabilityIssues(draft.cartItems, products);
  if (issues.length > 0) {
    throw new Error(getCartAvailabilityMessage(issues));
  }
};

export class FrontendOnlyOrderService implements OrderSubmissionService {
  constructor(
    private readonly products: Product[],
    private readonly allowOutOfStockCheckout: boolean,
  ) {}

  async submit(draft: OrderDraft): Promise<OrderSubmissionResult> {
    ensureCartAvailability(draft, this.products, this.allowOutOfStockCheckout);
    const order = buildOrderFromDraft(draft, 'frontend-fallback');

    return {
      success: true,
      order,
      mode: 'frontend-fallback',
      message:
        'Your order request has been received. Please use WhatsApp or email on the next page for faster confirmation.',
    };
  }
}

export class GoogleSheetsOrderService implements OrderSubmissionService {
  constructor(
    private readonly products: Product[],
    private readonly allowOutOfStockCheckout: boolean,
  ) {}

  async submit(draft: OrderDraft): Promise<OrderSubmissionResult> {
    ensureCartAvailability(draft, this.products, this.allowOutOfStockCheckout);
    const localOrder = buildOrderFromDraft(draft, 'google-sheets');

    const result = await submitOrderToGoogleSheets({
      order: localOrder,
      slipFile: draft.slip.file,
      honeypot: draft.honeypot ?? '',
    });

    const syncedOrder = {
      ...localOrder,
      orderId: result.orderId || localOrder.orderId,
      submittedAt: new Date().toISOString(),
      slip: {
        ...localOrder.slip,
        referenceUrl: result.slipUrl || localOrder.slip.referenceUrl,
        ...(result.driveFileId ? { driveFileId: result.driveFileId } : {}),
      },
    };

    const order = {
      ...syncedOrder,
      whatsappMessage: buildWhatsAppMessage(syncedOrder),
    };

    return {
      success: true,
      order,
      mode: 'google-sheets',
      message:
        'Your order request has been sent to Dotfumes. The team will review it and contact you as early as possible.',
      ...(result.slipUrl ? { slipUrl: result.slipUrl } : {}),
      ...(result.driveFileId ? { driveFileId: result.driveFileId } : {}),
    };
  }
}

export class SupabaseOrderService implements OrderSubmissionService {
  constructor(private readonly products: Product[]) {}

  async submit(draft: OrderDraft): Promise<OrderSubmissionResult> {
    if (!supabase) throw new Error('Supabase is not configured.');
    ensureCartAvailability(draft, this.products, false);
    const localOrder = buildOrderFromDraft(draft, 'supabase');
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string' || !result.includes(',')) reject(new Error('Unable to read payment slip.'));
        else resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(new Error('Unable to read payment slip.'));
      reader.readAsDataURL(draft.slip.file);
    });
    const { data, error } = await supabase.functions.invoke('submit-order', {
      body: {
        honeypot: draft.honeypot ?? '',
        order: localOrder,
        slip: { fileName: draft.slip.file.name, mimeType: draft.slip.file.type, fileSize: draft.slip.file.size, base64 },
      },
    });
    if (error || !data?.success || !data?.orderId || !Array.isArray(data?.items)) {
      throw new Error(data?.message || error?.message || 'Unable to submit your order. Please try again.');
    }
    const syncedOrder: OrderPayload = {
      ...localOrder, orderId: data.orderId, submittedAt: new Date().toISOString(),
      subtotal: data.subtotal, total: data.total, items: data.items,
      slip: { ...localOrder.slip, referenceUrl: 'Payment proof submitted privately' },
    };
    return { success: true, order: { ...syncedOrder, whatsappMessage: buildWhatsAppMessage(syncedOrder) }, mode: 'supabase', message: 'Your order request has been sent to Dotfumes for payment verification.' };
  }
}

export class BackendOrderService implements OrderSubmissionService {
  async submit(draft: OrderDraft): Promise<OrderSubmissionResult> {
    void draft;
    throw new Error(
      'TODO: Implement managed backend order submission (database + storage + server-side notifications).',
    );
  }
}

export const createOrderSubmissionService = (params: {
  products: Product[];
  allowOutOfStockCheckout: boolean;
}): OrderSubmissionService => {
  const { products, allowOutOfStockCheckout } = params;

  if (isSupabaseConfigured) {
    return new SupabaseOrderService(products);
  }

  if (isGoogleSheetsBackendEnabled()) {
    return new GoogleSheetsOrderService(products, allowOutOfStockCheckout);
  }

  return new FrontendOnlyOrderService(products, allowOutOfStockCheckout);
};
