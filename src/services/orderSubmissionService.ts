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

  if (isGoogleSheetsBackendEnabled()) {
    return new GoogleSheetsOrderService(products, allowOutOfStockCheckout);
  }

  return new FrontendOnlyOrderService(products, allowOutOfStockCheckout);
};
