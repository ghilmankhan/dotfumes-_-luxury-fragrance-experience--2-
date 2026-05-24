import { CheckoutFormValues } from '../models/order';
import { CartItem, Product } from '../models/types';

export const MAX_SLIP_SIZE_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_SLIP_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export type CheckoutErrors = Partial<Record<keyof CheckoutFormValues | 'slip' | 'cart', string>>;
export type CartAvailabilityIssueType = 'missing' | 'inactive' | 'out-of-stock' | 'quantity-exceeded';

export interface CartAvailabilityIssue {
  itemId: string;
  itemName: string;
  type: CartAvailabilityIssueType;
  requestedQuantity: number;
  availableStock: number;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^[+\d][\d\s-]{7,19}$/;

export const getAvailableStock = (product: Pick<Product, 'stock'> | Pick<CartItem, 'stock'>) => {
  const stock = Number(product.stock);
  if (!Number.isFinite(stock)) {
    return 0;
  }
  return Math.max(0, Math.floor(stock));
};

export const isProductOutOfStock = (product: Pick<Product, 'stock'> | Pick<CartItem, 'stock'>) =>
  getAvailableStock(product) <= 0;

export const validateCheckoutForm = (values: CheckoutFormValues, slipFile: File | null) => {
  const errors: CheckoutErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = 'Please enter your first name.';
  }

  if (!values.lastName.trim()) {
    errors.lastName = 'Please enter your last name.';
  }

  const trimmedEmail = values.email.trim();
  if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  const sanitizedPhone = values.phone.trim().replace(/\s+/g, '');
  if (!phoneRegex.test(sanitizedPhone)) {
    errors.phone = 'Please enter a valid phone number, including country code.';
  } else {
    const digitsOnly = sanitizedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      errors.phone = 'Please include a full phone number with country code.';
    }
  }

  if (values.address.trim().length < 8) {
    errors.address = 'Please add a complete delivery address.';
  }

  if (!values.city.trim()) {
    errors.city = 'Please enter your city.';
  }

  if (!values.paymentMethod) {
    errors.paymentMethod = 'Please select your payment method.';
  }

  if (!slipFile) {
    errors.slip = 'Please upload your payment slip.';
    return errors;
  }

  if (!SUPPORTED_SLIP_TYPES.includes(slipFile.type)) {
    errors.slip = 'Please upload JPG, PNG, WEBP, or PDF payment proof.';
  }

  if (slipFile.size === 0) {
    errors.slip = 'The selected file is empty. Please upload a valid payment slip.';
  }

  if (slipFile.size > MAX_SLIP_SIZE_BYTES) {
    errors.slip = 'Your payment slip exceeds 5MB. Please upload a smaller file.';
  }

  return errors;
};

export const validateCartQuantities = (items: CartItem[]) => {
  for (const item of items) {
    if (item.quantity <= 0) {
      return `${item.name} has an invalid quantity.`;
    }

    const availableStock = getAvailableStock(item);

    if (availableStock <= 0) {
      return `${item.name} is currently unavailable.`;
    }

    if (item.quantity > availableStock) {
      return `${item.name} exceeds the available stock.`;
    }
  }

  return '';
};

export const getCartAvailabilityIssues = (items: CartItem[], products: Product[]) => {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const issues: CartAvailabilityIssue[] = [];

  for (const item of items) {
    const latest = productMap.get(item.id);
    if (!latest) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        type: 'missing',
        requestedQuantity: item.quantity,
        availableStock: 0,
      });
      continue;
    }

    if (latest.active === false) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        type: 'inactive',
        requestedQuantity: item.quantity,
        availableStock: 0,
      });
      continue;
    }

    const availableStock = getAvailableStock(latest);
    if (availableStock <= 0) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        type: 'out-of-stock',
        requestedQuantity: item.quantity,
        availableStock,
      });
      continue;
    }

    if (item.quantity > availableStock) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        type: 'quantity-exceeded',
        requestedQuantity: item.quantity,
        availableStock,
      });
    }
  }

  return issues;
};

export const getCartAvailabilityMessage = (issues: CartAvailabilityIssue[]) => {
  if (issues.length === 0) {
    return '';
  }

  const first = issues[0];

  if (first.type === 'missing') {
    return `${first.itemName} is no longer available. Please refresh your selection.`;
  }

  if (first.type === 'inactive') {
    return `${first.itemName} is currently unavailable. Please update your selection.`;
  }

  if (first.type === 'out-of-stock') {
    return `${first.itemName} is currently out of stock. Please update your selection.`;
  }

  return `${first.itemName} exceeds available stock. Please reduce quantity to continue.`;
};
