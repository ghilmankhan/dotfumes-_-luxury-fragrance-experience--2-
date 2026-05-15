import {
  OrderDraft,
  OrderPayload,
  OrderSubmissionMode,
  OrderSubmissionResult,
} from '../models/order';
import { buildOrderPayload, buildWhatsAppMessage, createOrderId } from '../lib/order';
import { isGoogleSheetsBackendEnabled, submitOrderToGoogleSheets } from '../lib/googleSheetsBackend';

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

export class FrontendOnlyOrderService implements OrderSubmissionService {
  async submit(draft: OrderDraft): Promise<OrderSubmissionResult> {
    const order = buildOrderFromDraft(draft, 'frontend-fallback');

    return {
      success: true,
      order,
      mode: 'frontend-fallback',
      message: 'Order prepared locally. Complete WhatsApp or email handoff to notify DOTFUMES.',
    };
  }
}

export class GoogleSheetsOrderService implements OrderSubmissionService {
  async submit(draft: OrderDraft): Promise<OrderSubmissionResult> {
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
      message: 'Order submitted to DOTFUMES desk. Complete the handoff message for instant review.',
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

export const createOrderSubmissionService = (): OrderSubmissionService => {
  if (isGoogleSheetsBackendEnabled()) {
    return new GoogleSheetsOrderService();
  }

  return new FrontendOnlyOrderService();
};
