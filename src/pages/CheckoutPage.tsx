import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, Upload, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCartStore } from '../store/useCartStore';
import { useToastStore } from '../store/useToastStore';
import { AssetImage } from '../components/AssetImage';
import { CheckoutErrors, validateCartQuantities, validateCheckoutForm } from '../lib/validation';
import { formatCurrency } from '../lib/order';
import { saveLatestOrder } from '../lib/storage';
import { CheckoutFormValues, PaymentMethod } from '../models/order';
import { usePageMeta } from '../hooks/usePageMeta';
import { createOrderSubmissionService } from '../services/orderSubmissionService';
import { createSlipPreviewUrl, revokeSlipPreviewUrl } from '../lib/paymentSlip';
import { FEATURED_PRODUCTS } from '../constants/products';
import { isGoogleSheetsBackendEnabled } from '../lib/googleSheetsBackend';

const initialValues: CheckoutFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  paymentMethod: '',
};

const paymentOptions: Array<{ value: PaymentMethod; label: string; note: string }> = [
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
];

export const CheckoutPage = () => {
  const { items, total, updateQuantity, removeItem, clearCart } = useCartStore();
  const { pushToast } = useToastStore();
  const navigate = useNavigate();

  const [values, setValues] = useState<CheckoutFormValues>(initialValues);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const reduceMotion = useReducedMotion();
  const orderSubmissionService = useMemo(() => createOrderSubmissionService(), []);
  const googleSheetsEnabled = isGoogleSheetsBackendEnabled();

  usePageMeta({
    title: 'Checkout | DOTFUMES',
    description:
      'Secure your DOTFUMES selection with customer details, payment method, and slip upload.',
    path: '/checkout',
    robots: 'noindex,nofollow',
  });

  useEffect(() => {
    return () => {
      revokeSlipPreviewUrl(slipPreviewUrl);
    };
  }, [slipPreviewUrl]);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const clearError = (key: keyof CheckoutErrors) => {
    setErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const setField = (field: keyof CheckoutFormValues, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    clearError(field);
  };

  const onSlipChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSlipFile(null);
      revokeSlipPreviewUrl(slipPreviewUrl);
      setSlipPreviewUrl('');
      return;
    }

    const nextErrors = validateCheckoutForm(values, file);
    const preview = createSlipPreviewUrl(file);
    revokeSlipPreviewUrl(slipPreviewUrl);

    setSlipFile(file);
    setSlipPreviewUrl(preview);
    const slipError = nextErrors.slip;
    if (typeof slipError === 'string') {
      setErrors((previous) => ({ ...previous, slip: slipError }));
    } else {
      clearError('slip');
    }
  };

  const removeSlip = () => {
    setSlipFile(null);
    revokeSlipPreviewUrl(slipPreviewUrl);
    setSlipPreviewUrl('');
    clearError('slip');
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (submitError) {
      setSubmitError('');
    }

    const staleItems = items.filter(
      (item) => !FEATURED_PRODUCTS.some((product) => product.id === item.id),
    );
    if (staleItems.length > 0) {
      const names = staleItems.map((item) => item.name).join(', ');
      const message = `One or more fragrances are no longer available: ${names}. Please refresh your selection.`;
      setErrors({ cart: message });
      pushToast('Please review your selection before checkout.', 'error');
      return;
    }

    if (items.length === 0) {
      setErrors({ cart: 'Your cart is empty. Please add at least one fragrance.' });
      pushToast('Your selection is empty.', 'error');
      return;
    }

    const quantityError = validateCartQuantities(items);
    if (quantityError) {
      setErrors({ cart: quantityError });
      pushToast(quantityError, 'error');
      return;
    }

    const nextErrors = validateCheckoutForm(values, slipFile);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !slipFile) {
      pushToast('Please complete the highlighted checkout details.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await orderSubmissionService.submit({
        values,
        cartItems: items,
        slip: {
          file: slipFile,
          previewUrl: slipPreviewUrl,
        },
        honeypot,
      });
      saveLatestOrder(result.order);
      clearCart();
      pushToast(result.message, result.mode === 'google-sheets' ? 'success' : 'neutral');
      navigate('/order-confirmation');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to submit your order right now. Please try again shortly.';
      setSubmitError(message);
      pushToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-brand-white px-6 pb-24 pt-36 text-brand-black md:px-16 md:pt-44 lg:px-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_430px]">
        <form onSubmit={submitOrder} className="order-2 space-y-12 lg:order-1" noValidate>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-brand-gold">
              Checkout
            </span>
            <h1 className="mt-7 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
              Complete <br />
              <span className="text-neutral-300">Your Order.</span>
            </h1>
            <p className="mt-8 max-w-xl text-sm leading-7 text-black/55">
              Finalize your details, choose a payment method, and upload your payment slip to
              complete your DOTFUMES order handoff.
            </p>
            <p className="mt-3 max-w-xl text-xs leading-6 text-black/50">
              After placing your order, WhatsApp and email open prefilled details. You may need to
              tap send to complete handoff.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {errors.cart ? (
              <motion.div
                key="cart-error"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                <AlertTriangle size={16} className="mt-0.5" />
                <p>{errors.cart}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {submitError ? (
              <motion.div
                key="submit-error"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                <AlertTriangle size={16} className="mt-0.5" />
                <p>{submitError}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="space-y-8">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.35em] text-black/40">
              Customer Details
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              <CheckoutInput
                label="First name"
                name="firstName"
                value={values.firstName}
                onChange={(value) => setField('firstName', value)}
                error={errors.firstName}
                autoComplete="given-name"
              />
              <CheckoutInput
                label="Last name"
                name="lastName"
                value={values.lastName}
                onChange={(value) => setField('lastName', value)}
                error={errors.lastName}
                autoComplete="family-name"
              />
              <CheckoutInput
                label="Email"
                name="email"
                value={values.email}
                onChange={(value) => setField('email', value)}
                error={errors.email}
                type="email"
                autoComplete="email"
              />
              <CheckoutInput
                label="Phone"
                name="phone"
                value={values.phone}
                onChange={(value) => setField('phone', value)}
                error={errors.phone}
                type="tel"
                autoComplete="tel"
              />
              <div className="md:col-span-2">
                <CheckoutInput
                  label="Delivery address"
                  name="address"
                  value={values.address}
                  onChange={(value) => setField('address', value)}
                  error={errors.address}
                  autoComplete="street-address"
                />
              </div>
              <CheckoutInput
                label="City"
                name="city"
                value={values.city}
                onChange={(value) => setField('city', value)}
                error={errors.city}
                autoComplete="address-level2"
              />
            </div>
          </div>

          <div className="space-y-7">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.35em] text-black/40">
              Payment Method
            </h2>

            <div className="grid gap-3">
              {paymentOptions.map((option) => {
                const selected = values.paymentMethod === option.value;

                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer border px-4 py-4 transition-colors ${
                      selected
                        ? 'border-brand-black bg-brand-black text-white'
                        : 'border-black/10 bg-white hover:border-black/35'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      className="sr-only"
                      value={option.value}
                      checked={selected}
                      onChange={(event) => setField('paymentMethod', event.target.value)}
                    />
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em]">{option.label}</p>
                    <p
                      className={`mt-2 text-xs leading-5 ${
                        selected ? 'text-white/70' : 'text-black/55'
                      }`}
                    >
                      {option.note}
                    </p>
                  </label>
                );
              })}
            </div>
            {errors.paymentMethod ? <FieldError message={errors.paymentMethod} /> : null}
          </div>

          <div className="sr-only" aria-hidden>
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              autoComplete="off"
              tabIndex={-1}
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.35em] text-black/40">
              Payment Slip Upload
            </h2>

            <label className="block cursor-pointer border border-dashed border-black/20 bg-white px-5 py-8 transition-colors hover:border-brand-gold">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="sr-only"
                onChange={onSlipChange}
              />
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10">
                  <Upload size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em]">
                    Upload Slip (JPG / PNG / WEBP / PDF)
                  </p>
                  <p className="mt-1 text-xs text-black/45">
                    Required for payment verification. Maximum file size: 5MB.
                  </p>
                </div>
              </div>
            </label>

            {errors.slip ? <FieldError message={errors.slip} /> : null}

            <AnimatePresence mode="wait">
              {slipFile ? (
                <motion.div
                  key="slip-preview"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="border border-black/10 p-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.28em] text-black/45">Slip Preview</p>
                  {slipPreviewUrl ? (
                    <AssetImage
                      src={slipPreviewUrl}
                      alt={`Slip preview ${slipFile.name}`}
                      wrapperClassName="mt-3 aspect-[4/3] w-full bg-neutral-100"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="mt-3 flex aspect-[4/3] w-full items-center justify-center bg-neutral-100 text-center text-xs uppercase tracking-[0.24em] text-black/45">
                      PDF file selected
                    </div>
                  )}
                  <p className="mt-3 text-xs text-black/60">
                    {slipFile.name} · {(slipFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={removeSlip}
                    className="mt-3 text-[10px] uppercase tracking-[0.22em] text-black/50 underline decoration-black/30 underline-offset-2 hover:text-black"
                  >
                    Remove slip
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="border border-black/10 bg-brand-ivory px-5 py-4 text-xs leading-6 text-black/60">
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="mt-1 text-brand-gold" />
              {googleSheetsEnabled ? (
                <p>
                  Orders are sent to your Google Sheets desk with Drive slip storage and owner
                  email notification. After confirmation, open WhatsApp to send the prefilled
                  message to your team.
                </p>
              ) : (
                <p>
                  This checkout is in private handoff mode. Your slip stays on this device until you
                  send the prefilled WhatsApp or email handoff.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="w-full bg-brand-black px-8 py-5 text-[10px] font-bold uppercase tracking-[0.35em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
          >
            {isSubmitting
              ? googleSheetsEnabled
                ? 'Submitting Order'
                : 'Preparing Order'
              : 'Place Order'}
          </button>
        </form>

        <aside className="order-1 h-fit border border-black/10 bg-white p-6 shadow-[0_28px_80px_rgba(0,0,0,0.05)] lg:order-2 lg:sticky lg:top-28">
          <h2 className="font-serif text-3xl italic">Your Selection</h2>
          <div className="mt-8 space-y-6">
            {items.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-[10px] uppercase tracking-[0.32em] text-black/35">
                  Your selection is empty.
                </p>
                <Link
                  to="/collection"
                  className="mt-7 inline-flex border-b border-black/20 pb-1 text-[10px] uppercase tracking-[0.3em]"
                >
                  Explore Collection
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex gap-5 border-b border-black/5 pb-6">
                  <AssetImage
                    src={item.images.front}
                    alt={item.name}
                    wrapperClassName="h-28 w-20 shrink-0 bg-neutral-50"
                    className="h-full w-full object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-xl italic">{item.name}</p>
                        <p className="mt-2 text-[9px] uppercase tracking-[0.25em] text-black/35">
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-black/30 transition-colors hover:text-red-500"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={15} strokeWidth={1.4} />
                      </button>
                    </div>

                    <div className="mt-5 flex w-fit items-center border border-black/10">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2"
                        aria-label={`Decrease ${item.name}`}
                      >
                        <Minus size={12} strokeWidth={1.4} />
                      </button>
                      <span className="w-8 text-center text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2"
                        aria-label={`Increase ${item.name}`}
                      >
                        <Plus size={12} strokeWidth={1.4} />
                      </button>
                    </div>
                    <p className="mt-3 text-[9px] uppercase tracking-[0.2em] text-black/35">
                      Stock: {item.stock}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 space-y-3 border-t border-black/10 pt-6">
            <div className="flex items-end justify-between">
              <span className="text-[10px] uppercase tracking-[0.35em] text-black/35">Items</span>
              <span className="text-sm text-black/60">{totalItems}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-[10px] uppercase tracking-[0.35em] text-black/35">Subtotal</span>
              <span className="font-serif text-3xl italic">{formatCurrency(total())}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

const CheckoutInput = ({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  type?: string;
  autoComplete?: string;
}) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-[0.3em] text-black/40">{label}</span>
    <input
      required
      name={name}
      type={type}
      value={value}
      autoComplete={autoComplete}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${name}-error` : undefined}
      onChange={(event) => onChange(event.target.value)}
      className={`mt-3 w-full border bg-white px-4 py-4 text-sm outline-none transition-colors focus:border-brand-gold ${
        error ? 'border-red-300' : 'border-black/10'
      }`}
    />
    {error ? <FieldError message={error} id={`${name}-error`} /> : null}
  </label>
);

const FieldError = ({ message, id }: { message: string; id?: string }) => (
  <p id={id} className="mt-2 text-xs text-red-600" role="alert">
    {message}
  </p>
);
