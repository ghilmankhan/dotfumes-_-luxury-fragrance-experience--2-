import { CartItem } from './types';

export type PaymentMethod = 'bank-transfer' | 'easypaisa' | 'jazzcash';
export type PaymentStatus = 'Pending Verification' | 'Verified' | 'Rejected';
export type OrderStatus = 'New' | 'Processing' | 'Completed' | 'Cancelled';
export type OrderSubmissionMode = 'frontend-fallback' | 'google-sheets';

export interface CheckoutFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  paymentMethod: PaymentMethod | '';
}

export interface OrderLineItem {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

export interface SlipDetails {
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl?: string;
  driveFileId?: string;
  referenceUrl: string;
}

export interface OrderPayload {
  orderId: string;
  createdAt: string;
  submittedAt?: string;
  currency: 'USD';
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  submissionMode: OrderSubmissionMode;
  whatsappMessage: string;
  items: OrderLineItem[];
  customer: CustomerDetails;
  slip: SlipDetails;
}

export interface PaymentSlipFile {
  file: File;
  previewUrl?: string;
}

export interface OrderDraft {
  values: CheckoutFormValues;
  cartItems: CartItem[];
  slip: PaymentSlipFile;
  honeypot?: string;
  orderId?: string;
}

export interface OrderSubmissionResult {
  success: boolean;
  order: OrderPayload;
  mode: OrderSubmissionMode;
  message: string;
  slipUrl?: string;
  driveFileId?: string;
}

export interface GoogleAppsScriptOrderResponse {
  success: boolean;
  orderId?: string;
  slipUrl?: string;
  driveFileId?: string;
  message?: string;
  whatsappUrl?: string;
}
