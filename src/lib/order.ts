import { CartItem } from '../models/types';
import { CheckoutFormValues, OrderPayload, PaymentMethod } from '../models/order';
import { appConfig } from './config';

const orderPrefix = 'DF';
const defaultDeliveryFee = 0;
const maxMailtoUrlLength = 1800;

const formatAmount = (value: number) => `$${value.toFixed(2)}`;

export const formatPaymentMethodLabel = (method: PaymentMethod) => {
  switch (method) {
    case 'bank-transfer':
      return 'Bank Transfer';
    case 'easypaisa':
      return 'Easypaisa';
    case 'jazzcash':
      return 'JazzCash';
    default:
      return method;
  }
};

export const formatOrderItems = (items: OrderPayload['items']) =>
  items
    .map((item, index) => {
      const sku = item.sku ? ` [${item.sku}]` : '';
      return `${index + 1}. ${item.name}${sku} x${item.quantity} - ${formatAmount(item.lineTotal)}`;
    })
    .join('\n');

export const formatQuantitySummary = (items: OrderPayload['items']) =>
  items
    .map((item) => {
      const sku = item.sku ? ` (${item.sku})` : '';
      return `${item.name}${sku} x${item.quantity}`;
    })
    .join(', ');

export const createOrderId = () => {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate(),
  ).padStart(2, '0')}`;
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${orderPrefix}-${datePart}-${randomPart}`;
};

export const createSlipReferenceUrl = (orderId: string, fileName: string) => {
  const encoded = encodeURIComponent(fileName.toLowerCase().replace(/\s+/g, '-'));
  return `local-slip://${orderId}/${encoded}`;
};

export const buildWhatsAppMessage = (order: OrderPayload) =>
  [
    `Hello Dotfumes Team, I just placed order request ${order.orderId}.`,
    '',
    `Name: ${order.customer.fullName}`,
    `Email: ${order.customer.email}`,
    `Phone: ${order.customer.phone}`,
    `City: ${order.customer.city}`,
    `Address: ${order.customer.address}`,
    `Payment Method: ${formatPaymentMethodLabel(order.paymentMethod)}`,
    `Slip Uploaded: ${order.slip.referenceUrl ? 'Yes' : 'No'}`,
    '',
    'Order Items:',
    formatOrderItems(order.items),
    '',
    `Subtotal: ${formatAmount(order.subtotal)}`,
    `Delivery Fee: ${formatAmount(order.deliveryFee)}`,
    `Total: ${formatAmount(order.total)}`,
    `Slip URL: ${order.slip.referenceUrl}`,
    '',
    'Please confirm my Dotfumes order.',
  ].join('\n');

export const buildOrderPayload = (params: {
  orderId: string;
  values: CheckoutFormValues;
  cartItems: CartItem[];
  slipFile: File;
  slipPreviewUrl?: string;
  slipReferenceUrl?: string;
}): OrderPayload => {
  const {
    orderId,
    values,
    cartItems,
    slipFile,
    slipPreviewUrl,
    slipReferenceUrl,
  } = params;

  const items = cartItems.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    slug: item.slug,
    quantity: item.quantity,
    unitPrice: item.price,
    lineTotal: item.price * item.quantity,
  }));

  const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
  const deliveryFee = defaultDeliveryFee;
  const total = subtotal + deliveryFee;
  const fullName = `${values.firstName.trim()} ${values.lastName.trim()}`.trim();

  const order: OrderPayload = {
    orderId,
    createdAt: new Date().toISOString(),
    currency: 'USD',
    paymentMethod: values.paymentMethod as OrderPayload['paymentMethod'],
    subtotal,
    deliveryFee,
    total,
    paymentStatus: 'Pending Verification',
    orderStatus: 'New',
    submissionMode: 'supabase',
    whatsappMessage: '',
    items,
    customer: {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      fullName,
      email: values.email.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
    },
    slip: {
      fileName: slipFile.name,
      fileSize: slipFile.size,
      mimeType: slipFile.type,
      referenceUrl: slipReferenceUrl ?? createSlipReferenceUrl(orderId, slipFile.name),
      ...(slipPreviewUrl ? { previewUrl: slipPreviewUrl } : {}),
    },
  };

  const whatsappMessage = buildWhatsAppMessage(order);
  return {
    ...order,
    whatsappMessage,
  };
};

export const buildWhatsAppOrderUrl = (order: OrderPayload) => {
  if (!appConfig.hasConfiguredWhatsAppNumber) {
    return '';
  }

  const phone = appConfig.clientWhatsAppNumber.replace(/[^\d]/g, '');
  if (!phone) {
    return '';
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(order.whatsappMessage)}`;
};

export const buildOrderEmailUrl = (order: OrderPayload) => {
  if (!appConfig.hasConfiguredOrderEmail) {
    return '';
  }

  const subject = `Dotfumes Order Request — ${order.orderId}`;
  const fullBody = [
    `Order ID: ${order.orderId}`,
    `Placed At: ${new Date(order.createdAt).toLocaleString()}`,
    '',
    `Name: ${order.customer.fullName}`,
    `Email: ${order.customer.email}`,
    `Phone: ${order.customer.phone}`,
    `City: ${order.customer.city}`,
    `Address: ${order.customer.address}`,
    `Payment Method: ${formatPaymentMethodLabel(order.paymentMethod)}`,
    `Slip Uploaded: ${order.slip.referenceUrl ? 'Yes' : 'No'}`,
    '',
    'Order Items:',
    formatOrderItems(order.items),
    '',
    `Subtotal: ${formatAmount(order.subtotal)}`,
    `Delivery Fee: ${formatAmount(order.deliveryFee)}`,
    `Total: ${formatAmount(order.total)}`,
    `Slip URL: ${order.slip.referenceUrl}`,
    '',
    'Please confirm this order request and share next steps for delivery coordination.',
  ].join('\n');

  const fullUrl = `mailto:${appConfig.clientOrderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
  if (fullUrl.length <= maxMailtoUrlLength) {
    return fullUrl;
  }

  const compactBody = [
    `Order ID: ${order.orderId}`,
    `Client: ${order.customer.fullName}`,
    `Phone: ${order.customer.phone}`,
    `Total: ${formatAmount(order.total)}`,
    `Payment: ${formatPaymentMethodLabel(order.paymentMethod)}`,
    `Slip URL: ${order.slip.referenceUrl}`,
    '',
    'Please confirm this order request and share next steps.',
  ].join('\n');

  return `mailto:${appConfig.clientOrderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compactBody)}`;
};

export const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
