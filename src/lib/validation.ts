import { CheckoutFormValues } from '../models/order';
import { CartItem } from '../models/types';

export const MAX_SLIP_SIZE_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_SLIP_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export type CheckoutErrors = Partial<Record<keyof CheckoutFormValues | 'slip' | 'cart', string>>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^[+\d][\d\s-]{7,19}$/;

export const validateCheckoutForm = (values: CheckoutFormValues, slipFile: File | null) => {
  const errors: CheckoutErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = 'Please enter your first name.';
  }

  if (!values.lastName.trim()) {
    errors.lastName = 'Please enter your last name.';
  }

  if (!emailRegex.test(values.email.trim())) {
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

    if (item.quantity > item.stock) {
      return `${item.name} exceeds the available stock.`;
    }
  }

  return '';
};
