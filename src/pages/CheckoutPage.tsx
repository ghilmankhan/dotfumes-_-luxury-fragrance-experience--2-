import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCartStore, selectCartCount, selectCartTotal } from '../store/useCartStore';
import { useToastStore } from '../store/useToastStore';
import { useCartAvailability } from '../hooks/useCartAvailability';
import { AssetImage } from '../components/AssetImage';
import {
  CheckoutErrors,
  getCartAvailabilityIssues,
  getCartAvailabilityMessage,
  validateCheckoutForm,
} from '../lib/validation';
import { formatCurrency } from '../lib/order';
import { saveLatestOrder } from '../lib/storage';
import { CheckoutFormValues, PaymentMethod } from '../models/order';
import { usePageMeta } from '../hooks/usePageMeta';
import { createOrderSubmissionService } from '../services/orderSubmissionService';
import { createSlipPreviewUrl, revokeSlipPreviewUrl } from '../lib/paymentSlip';
import { isGoogleSheetsBackendEnabled } from '../lib/googleSheetsBackend';
import { useProductCatalogStore } from '../store/useProductCatalogStore';
import { cn } from '../lib/utils';
import { CartLineItem } from '../components/cart/CartLineItem';
import { easing, duration } from '../styles/tokens/motion';
import { tracking } from '../styles/tokens/typography';
import { focusRing } from '../styles/tokens/interactive';
import { Button } from '../components/ui/primitives/Button';
import { Card } from '../components/ui/primitives/Card';
import { Grid } from '../components/ui/layout/Grid';
import { Stack } from '../components/ui/layout/Stack';
import { Input } from '../components/ui/primitives/Input';

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

// Order matches the visual top-to-bottom form order, so the first match is the first invalid field on screen.
const errorFieldOrder: Array<keyof CheckoutErrors> = [
  'cart',
  'firstName',
  'lastName',
  'email',
  'phone',
  'address',
  'city',
  'paymentMethod',
  'slip',
];

const scrollToFirstError = (errs: CheckoutErrors) => {
  if (typeof window === 'undefined') {
    return;
  }
  const firstKey = errorFieldOrder.find((key) => errs[key]);
  if (!firstKey) {
    return;
  }
  const target =
    firstKey === 'cart' ? document.getElementById('checkout-cart-error') : document.getElementsByName(firstKey)[0];
  if (!target) {
    return;
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (target instanceof HTMLElement) {
    window.setTimeout(() => target.focus({ preventScroll: true }), 400);
  }
};

export const CheckoutPage = () => {
  const items = useCartStore((s) => s.items);
  const totalItems = useCartStore(selectCartCount);
  const total = useCartStore(selectCartTotal);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const decrementOrRemove = useCartStore((s) => s.decrementOrRemove);
  const clearCart = useCartStore((s) => s.clearCart);
  const pushToast = useToastStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [values, setValues] = useState<CheckoutFormValues>(initialValues);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const handleRequestRemove = useCallback((id: string) => setPendingRemoveId(id), []);
  const handleCancelRemove = useCallback(() => setPendingRemoveId(null), []);
  const handleConfirmRemove = useCallback(
    (id: string) => {
      const item = items.find((cartItem) => cartItem.id === id);
      updateQuantity(id, 0);
      setPendingRemoveId(null);
      if (item) {
        pushToast(`${item.name} removed from your selection.`, 'neutral');
      }
    },
    [items, updateQuantity, pushToast],
  );
  const handleUpdateQuantity = useCallback(
    (id: string, quantity: number) => updateQuantity(id, quantity),
    [updateQuantity],
  );
  const handleDecrement = useCallback(
    (id: string) => decrementOrRemove(id),
    [decrementOrRemove],
  );
  const reduceMotion = useReducedMotion();
  const allProducts = useProductCatalogStore((state) => state.allProducts);
  const allowOutOfStockCheckout = useProductCatalogStore(
    (state) => state.settings.allowOutOfStockCheckout,
  );
  const refreshCatalog = useProductCatalogStore((state) => state.refresh);
  const orderSubmissionService = useMemo(
    () =>
      createOrderSubmissionService({
        products: allProducts,
        allowOutOfStockCheckout,
      }),
    [allProducts, allowOutOfStockCheckout],
  );
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

  const {
    productById: latestProductById,
    availabilityIssues,
    availabilityIssueByItem,
  } = useCartAvailability();
  const detailsStepComplete = Boolean(
    values.firstName.trim() &&
      values.lastName.trim() &&
      values.phone.trim() &&
      values.address.trim() &&
      values.city.trim(),
  );
  const paymentStepComplete = Boolean(values.paymentMethod && slipFile);

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

    const cartAvailabilityIssues = getCartAvailabilityIssues(items, allProducts);
    if (!allowOutOfStockCheckout && cartAvailabilityIssues.length > 0) {
      const message = getCartAvailabilityMessage(cartAvailabilityIssues);
      const cartErrors: CheckoutErrors = { cart: message };
      setErrors(cartErrors);
      scrollToFirstError(cartErrors);
      pushToast('Please review your selection before checkout.', 'error');
      return;
    }

    if (items.length === 0) {
      const cartErrors: CheckoutErrors = { cart: 'Your cart is empty. Please add at least one fragrance.' };
      setErrors(cartErrors);
      scrollToFirstError(cartErrors);
      pushToast('Your selection is empty.', 'error');
      return;
    }

    const nextErrors = validateCheckoutForm(values, slipFile);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !slipFile) {
      scrollToFirstError(nextErrors);
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
      void refreshCatalog();
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
        <div className="order-1 lg:col-start-1 lg:row-start-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">
            Checkout
          </span>
          <h1 className="mt-7 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
            Complete <br />
            <span className="text-neutral-300">Your Order.</span>
          </h1>
          <p className="mt-8 max-w-xl text-sm leading-7 text-black/65">
            Submit your details, choose your payment method, and upload payment proof so Dotfumes can
            review your order request.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-black/60">
            After submission, you can send a prefilled WhatsApp or email summary for faster
            confirmation.
          </p>

          <Grid cols={{ sm: 2 }} gap={2} className="mt-8" aria-label="Checkout progress">
            <Card
              variant="light"
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors',
                detailsStepComplete
                  ? 'border-brand-gold/50 bg-brand-gold/10 text-brand-black'
                  : 'bg-white/70 text-black/65',
              )}
            >
              {detailsStepComplete ? (
                <CheckCircle2 size={13} className="shrink-0 text-brand-gold" />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black/30" aria-hidden="true" />
              )}
              1. Your Details
            </Card>
            <Card
              variant="light"
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-[10px] uppercase tracking-[0.22em] transition-colors',
                paymentStepComplete
                  ? 'border-brand-gold/50 bg-brand-gold/10 text-brand-black'
                  : 'bg-white/70 text-black/65',
              )}
            >
              {paymentStepComplete ? (
                <CheckCircle2 size={13} className="shrink-0 text-brand-gold" />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black/30" aria-hidden="true" />
              )}
              2. Payment &amp; Proof
            </Card>
          </Grid>
        </div>

        <form
          onSubmit={submitOrder}
          className="order-2 space-y-12 lg:col-start-1 lg:row-start-2 lg:order-2"
          noValidate
        >
          <AnimatePresence mode="wait">
            {errors.cart ? (
              <motion.div
                key="cart-error"
                id="checkout-cart-error"
                tabIndex={-1}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: duration.fast, ease: easing.standard }}
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
                transition={{ duration: duration.fast, ease: easing.standard }}
                className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                <AlertTriangle size={16} className="mt-0.5" />
                <p>{submitError}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="space-y-8">
            <h2 className={cn('text-[11px] font-bold uppercase text-black/60', tracking.wide)}>
              1. Your Details
            </h2>
            <Grid cols={{ md: 2 }} gap={5}>
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
                label="Email (optional)"
                name="email"
                value={values.email}
                onChange={(value) => setField('email', value)}
                error={errors.email}
                type="email"
                autoComplete="email"
                required={false}
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
            </Grid>
          </div>

          <div className="space-y-7">
            <h2 className={cn('text-[11px] font-bold uppercase text-black/60', tracking.wide)}>
              2. Payment Method
            </h2>

            <Stack
              gap={3}
              className={cn(
                errors.paymentMethod && 'ring-1 ring-red-300 ring-offset-4 ring-offset-brand-white',
              )}
            >
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
                        selected ? 'text-white/80' : 'text-black/65'
                      }`}
                    >
                      {option.note}
                    </p>
                  </label>
                );
              })}
            </Stack>
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
            <h2 className={cn('text-[11px] font-bold uppercase text-black/60', tracking.wide)}>
              Payment Proof Upload
            </h2>

            <label
              className={cn(
                'block cursor-pointer border border-dashed bg-white px-5 py-8 transition-colors hover:border-brand-gold',
                errors.slip ? 'border-red-300 bg-red-50/40' : 'border-black/20',
              )}
            >
              <input
                type="file"
                name="slip"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="sr-only"
                onChange={onSlipChange}
              />
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10">
                  <Upload size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em]">
                    Upload Slip (JPG / PNG / WEBP / PDF)
                  </p>
                  <p className="mt-1 text-xs text-black/60">
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
                  transition={{ duration: 0.3, ease: easing.standard }}
                  className="border border-black/10 p-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.28em] text-black/60">Slip Preview</p>
                  {slipPreviewUrl ? (
                    <AssetImage
                      src={slipPreviewUrl}
                      alt={`Slip preview ${slipFile.name}`}
                      wrapperClassName="mt-3 aspect-[4/3] w-full bg-neutral-100"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="mt-3 flex aspect-[4/3] w-full items-center justify-center bg-neutral-100 text-center text-xs uppercase tracking-[0.24em] text-black/60">
                      PDF file selected
                    </div>
                  )}
                  <p className="mt-3 text-xs text-black/70">
                    {slipFile.name} · {(slipFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    onClick={removeSlip}
                    className="mt-3 flex min-h-11 items-center px-2 py-2 normal-case tracking-normal text-xs uppercase tracking-[0.2em] text-black/60 underline decoration-black/30 underline-offset-2 hover:text-black md:min-h-0 md:px-0 md:py-0"
                  >
                    Remove slip
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <Card variant="light" className="bg-brand-ivory px-5 py-4 text-xs leading-6 text-black/60">
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="mt-1 text-brand-gold" />
              {googleSheetsEnabled ? (
                <p>
                  Your order request and payment proof are received first, then reviewed manually by
                  Dotfumes. The team will contact you as early as possible for confirmation and
                  delivery coordination.
                </p>
              ) : (
                <p>
                  Your order request is prepared and saved locally. Use the prefilled WhatsApp or
                  email summary on the next page so Dotfumes can confirm your order quickly.
                </p>
              )}
            </div>
          </Card>

          <Card variant="light" className="px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-black/65">
              What Happens Next
            </p>
            <ol className="mt-4 space-y-2 text-sm leading-6 text-black/65">
              <li>1. Submit your order details and payment slip.</li>
              <li>2. Dotfumes reviews your payment proof manually.</li>
              <li>3. Dotfumes contacts you by WhatsApp or email for confirmation.</li>
              <li>4. Delivery coordination starts right after confirmation.</li>
            </ol>
          </Card>

          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={
              items.length === 0 || (!allowOutOfStockCheckout && availabilityIssues.length > 0)
            }
            className="w-full px-8 py-5 tracking-[0.35em]"
          >
            {isSubmitting
              ? googleSheetsEnabled
                ? 'Submitting Order'
                : 'Preparing Order'
              : 'Place Order Request'}
          </Button>
          <p className={cn('text-center text-[10px] uppercase text-black/58', tracking.normal)}>
            Your order request is sent now. Dotfumes will contact you as early as possible.
          </p>
        </form>

        <Card
          as="aside"
          variant="light"
          className="order-3 h-fit p-6 shadow-md lg:order-3 lg:col-start-2 lg:row-span-2 lg:sticky lg:top-28"
        >
          <h2 className="font-serif text-3xl italic">Your Selection</h2>
          <div className="mt-8 space-y-6">
            {items.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-[11px] uppercase tracking-[0.28em] text-black/55">
                  Your selection is empty.
                </p>
                <Link
                  to="/collection"
                  className={cn(
                    'mt-7 inline-flex border-b border-black/20 pb-1 text-[10px] uppercase',
                    tracking.wide,
                    focusRing,
                  )}
                >
                  Explore Collection
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <CartLineItem
                  key={item.id}
                  item={item}
                  variant="checkout"
                  stock={latestProductById.get(item.id)?.stock ?? item.stock}
                  isUnavailable={availabilityIssueByItem.has(item.id)}
                  isPendingRemove={pendingRemoveId === item.id}
                  onRequestRemove={handleRequestRemove}
                  onConfirmRemove={handleConfirmRemove}
                  onCancelRemove={handleCancelRemove}
                  onUpdateQuantity={handleUpdateQuantity}
                  onDecrement={handleDecrement}
                  priceLabel={formatCurrency(item.price)}
                />
              ))
            )}
          </div>

          <div className="mt-8 space-y-3 border-t border-black/10 pt-6">
            <div className="flex items-end justify-between">
              <span className="text-[10px] uppercase tracking-[0.35em] text-black/55">Items</span>
              <span className="text-sm text-black/60">{totalItems}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-[10px] uppercase tracking-[0.35em] text-black/55">Subtotal</span>
              <span className="font-serif text-3xl italic">{formatCurrency(total)}</span>
            </div>
          </div>
        </Card>
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
  required = true,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-[0.28em] text-black/60">{label}</span>
    <Input
      variant="light"
      error={Boolean(error)}
      required={required}
      name={name}
      type={type}
      value={value}
      autoComplete={autoComplete}
      aria-describedby={error ? `${name}-error` : undefined}
      onChange={(event) => onChange(event.target.value)}
      className="mt-3 py-4"
    />
    {error ? <FieldError message={error} id={`${name}-error`} /> : null}
  </label>
);

const FieldError = ({ message, id }: { message: string; id?: string }) => (
  <p id={id} className="mt-2 text-xs text-red-600" role="alert">
    {message}
  </p>
);
