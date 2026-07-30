import type { CheckoutFormValues, PaymentMethod } from '../models/order';

export const checkoutContract = {
  progressLabel: 'Checkout progress',
  experience: {
    opening: {
      eyebrow: 'Private Order',
      heading: 'Your selection, reserved.',
      support:
        'We will hold your fragrances while you complete a private, manually reviewed order.',
    },
    progress: ['Delivery', 'Payment', 'Private Review'],
    delivery: {
      heading: 'Where should we send your fragrance?',
      support: 'These details are used only to arrange your delivery and order updates.',
    },
    payment: {
      heading: 'Choose how you would like to complete your order.',
    },
    proof: {
      heading: 'Send Your Private Confirmation',
      support: 'Your confirmation is reviewed manually by the Dotfumes house.',
      control: 'Add Payment Confirmation',
      constraints: 'JPG, PNG, WEBP, or PDF. Maximum 5 MB.',
      selected: 'Confirmation Ready',
      ready: 'Ready for manual house review.',
    },
    trust: [
      {
        title: 'Reserved Selection',
        body: 'Your fragrance stays attached to this order while you complete checkout.',
      },
      {
        title: 'Manual House Review',
        body: 'A Dotfumes team member reviews each payment confirmation.',
      },
      {
        title: 'Order Reference',
        body: 'A unique order ID is created when your request is sent.',
      },
    ],
    cta: {
      reviewSelection: 'Review Your Reserved Selection',
      initial: 'Reserve Your Selection',
      partial: 'Continue Your Private Order',
      payment: 'Choose Payment Method',
      proof: 'Add Private Confirmation',
      readyPrefix: 'Send for Private Review',
      submitting: 'Sending to the House…',
    },
  },
  fields: {
    firstName: {
      name: 'firstName',
      label: 'First name',
      required: true,
      autoComplete: 'given-name',
      messages: { required: 'Please enter your first name.' },
    },
    lastName: {
      name: 'lastName',
      label: 'Last name',
      required: true,
      autoComplete: 'family-name',
      messages: { required: 'Please enter your last name.' },
    },
    email: {
      name: 'email',
      label: 'Email (optional)',
      required: false,
      type: 'email',
      autoComplete: 'email',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
      messages: { pattern: 'Please enter a valid email address.' },
    },
    phone: {
      name: 'phone',
      label: 'Phone',
      required: true,
      type: 'tel',
      autoComplete: 'tel',
      pattern: /^[+\d][\d\s-]{7,19}$/,
      minDigits: 10,
      messages: {
        pattern: 'Please enter a valid phone number, including country code.',
        minDigits: 'Please include a full phone number with country code.',
      },
    },
    address: {
      name: 'address',
      label: 'Delivery address',
      required: true,
      autoComplete: 'street-address',
      minLength: 8,
      messages: { minLength: 'Please add a complete delivery address.' },
    },
    city: {
      name: 'city',
      label: 'City',
      required: true,
      autoComplete: 'address-level2',
      messages: { required: 'Please enter your city.' },
    },
    paymentMethod: {
      name: 'paymentMethod',
      label: 'Payment method',
      required: true,
      messages: {
        required: 'Please select your payment method.',
        invalid: 'Please select a supported payment method.',
      },
    },
  },
  paymentMethods: [
    {
      value: 'bank-transfer',
      label: 'Bank Transfer',
      note: 'Attach the paid transfer slip to complete your order.',
    },
    {
      value: 'easypaisa',
      label: 'Easypaisa',
      note: 'Upload your Easypaisa payment screenshot as proof.',
    },
    {
      value: 'jazzcash',
      label: 'JazzCash',
      note: 'Upload your JazzCash receipt image before placing the order.',
    },
  ] satisfies ReadonlyArray<{ value: PaymentMethod; label: string; note: string }>,
  slip: {
    name: 'slip',
    required: true,
    accept: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
    maxSizeBytes: 5 * 1024 * 1024,
    messages: {
      required: 'Please upload your payment slip.',
      type: 'Please upload JPG, PNG, WEBP, or PDF payment proof.',
      empty: 'The selected file is empty. Please upload a valid payment slip.',
      size: 'Your payment slip exceeds 5 MB. Please upload a smaller file.',
    },
  },
  steps: [
    {
      id: 'details',
      label: '1. Your Details',
      fields: ['firstName', 'lastName', 'email', 'phone', 'address', 'city'],
    },
    {
      id: 'payment',
      label: '2. Payment & Proof',
      fields: ['paymentMethod', 'slip'],
    },
  ],
  submission: {
    label: 'Place Order Request',
    submittingLabel: 'Submitting Order',
    preparingLabel: 'Preparing Order',
    requiresCartItems: true,
    requiresAvailableStock: true,
    requiresValidForm: true,
  },
  initialValues: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    paymentMethod: '',
  } satisfies CheckoutFormValues,
  testFixtures: {
    validValues: {
      firstName: 'Amina',
      lastName: 'Khan',
      email: 'amina@example.com',
      phone: '+923001112233',
      address: 'Sunset Boulevard, Clifton',
      city: 'Karachi',
      paymentMethod: 'bank-transfer',
    } satisfies CheckoutFormValues,
    validSlip: {
      name: 'slip.png',
      type: 'image/png',
      contents: 'valid payment proof',
    },
  },
} as const;

export type CheckoutFieldName = keyof CheckoutFormValues;
export type CheckoutErrorName = CheckoutFieldName | 'slip' | 'cart';
export type CheckoutErrors = Partial<Record<CheckoutErrorName, string>>;
export type CheckoutStepId = (typeof checkoutContract.steps)[number]['id'];
export type CheckoutStepStatus = Record<CheckoutStepId, boolean>;
