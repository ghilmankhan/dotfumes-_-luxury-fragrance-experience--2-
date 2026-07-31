import { OrderDraft, OrderPayload, OrderSubmissionResult } from '../models/order';
import { buildOrderPayload, buildWhatsAppMessage, createOrderId } from '../lib/order';
import { isSupabaseBackendEnabled, submitOrderToSupabase } from '../lib/supabaseBackend';
import { getCartAvailabilityIssues, getCartAvailabilityMessage } from '../lib/validation';
import { Product } from '../models/types';

export interface OrderSubmissionService {
  submit(draft: OrderDraft): Promise<OrderSubmissionResult>;
}

const buildOrderFromDraft = (draft: OrderDraft): OrderPayload =>
  buildOrderPayload({
    orderId: draft.orderId ?? createOrderId(),
    values: draft.values,
    cartItems: draft.cartItems,
    slipFile: draft.slip.file,
    ...(draft.slip.previewUrl ? { slipPreviewUrl: draft.slip.previewUrl } : {}),
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

export class SupabaseOrderService implements OrderSubmissionService {
  constructor(
    private readonly products: Product[],
    private readonly allowOutOfStockCheckout: boolean,
  ) {}

  async submit(draft: OrderDraft): Promise<OrderSubmissionResult> {
    ensureCartAvailability(draft, this.products, this.allowOutOfStockCheckout);
    const localOrder = buildOrderFromDraft(draft);

    const result = await submitOrderToSupabase({
      order: localOrder,
      slipFile: draft.slip.file,
      honeypot: draft.honeypot ?? '',
    });

    // Server response is authoritative: pricing, stock, and totals are computed
    // atomically in the create_order RPC, never trusted from the client.
    const syncedOrder: OrderPayload = {
      ...localOrder,
      orderId: result.orderCode || result.orderId || localOrder.orderId,
      submittedAt: result.createdAt || new Date().toISOString(),
      ...(typeof result.subtotal === 'number' ? { subtotal: result.subtotal } : {}),
      ...(typeof result.deliveryFee === 'number' ? { deliveryFee: result.deliveryFee } : {}),
      ...(typeof result.total === 'number' ? { total: result.total } : {}),
      ...(result.items && result.items.length > 0
        ? {
            items: result.items.map((item, index) => ({
              id: localOrder.items[index]?.id ?? item.slug,
              ...(item.sku ? { sku: item.sku } : {}),
              name: item.name ?? localOrder.items[index]?.name ?? item.slug,
              slug: item.slug,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          }
        : {}),
    };

    const order = {
      ...syncedOrder,
      whatsappMessage: buildWhatsAppMessage(syncedOrder),
    };

    return {
      success: true,
      order,
      mode: 'supabase',
      message:
        'Your order request has been sent to Dotfumes. The team will review it and contact you as early as possible.',
    };
  }
}

export const createOrderSubmissionService = (params: {
  products: Product[];
  allowOutOfStockCheckout: boolean;
}): OrderSubmissionService => {
  const { products, allowOutOfStockCheckout } = params;

  if (!isSupabaseBackendEnabled()) {
    throw new Error(
      'Order backend is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  return new SupabaseOrderService(products, allowOutOfStockCheckout);
};
