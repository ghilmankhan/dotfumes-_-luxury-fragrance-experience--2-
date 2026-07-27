import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  createCartAvailabilitySelector,
  selectCartCount,
  selectCartItems,
  selectCartTotal,
  useCartStore,
} from '../store/useCartStore';
import { useToastStore } from '../store/useToastStore';
import { useCheckoutValidation } from '../hooks/useCheckoutValidation';
import { AssetImage } from '../components/AssetImage';
import { formatCurrency } from '../lib/order';
import { saveLatestOrder } from '../lib/storage';
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
import { checkoutContract, type CheckoutErrors } from '../contracts/checkout.contract';

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

type CartAvailability = ReturnType<ReturnType<typeof createCartAvailabilitySelector>>;

const scrollToFirstError = (errs: CheckoutErrors) => {
  if (typeof window === 'undefined') {
    return;
  }
  const firstKey = errorFieldOrder.find((key) => errs[key]);
  if (!firstKey) {
    return;
  }
  const target =
    firstKey === 'cart'
      ? document.getElementById('checkout-cart-error')
      : document.getElementsByName(firstKey)[0];
  if (!target) {
    return;
  }
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  target.scrollIntoView({ behavior, block: 'center' });
  if (target instanceof HTMLElement) {
    target.focus({ preventScroll: true });
  }
};

export const CheckoutPage = () => {
  const items = useCartStore(selectCartItems);
  const totalItems = useCartStore(selectCartCount);
  const total = useCartStore(selectCartTotal);
  const allProducts = useProductCatalogStore((state) => state.allProducts);
  const allowOutOfStockCheckout = useProductCatalogStore(
    (state) => state.settings.allowOutOfStockCheckout,
  );
  const availabilitySelector = useMemo(
    () => createCartAvailabilitySelector(allProducts, allowOutOfStockCheckout),
    [allProducts, allowOutOfStockCheckout],
  );
  const {
    productById: latestProductById,
    availabilityIssueByItem,
    shouldBlockCheckout,
    availabilityMessage,
  } = useCartStore(availabilitySelector);

  usePageMeta({
    title: 'Checkout | DOTFUMES',
    description:
      'Secure your DOTFUMES selection with customer details, payment method, and slip upload.',
    path: '/checkout',
    robots: 'noindex,nofollow',
  });

  return (
    <section className="min-h-screen bg-brand-white px-6 pb-24 pt-36 text-brand-black md:px-16 md:pt-44 lg:px-24">
      <Grid layout="content-sidebar" gap={12} className="mx-auto max-w-7xl">
        <CheckoutFlow
          items={items}
          allProducts={allProducts}
          allowOutOfStockCheckout={allowOutOfStockCheckout}
          shouldBlockCheckout={shouldBlockCheckout}
          availabilityMessage={availabilityMessage}
        />
        <CheckoutSummary
          items={items}
          totalItems={totalItems}
          total={total}
          latestProductById={latestProductById}
          availabilityIssueByItem={availabilityIssueByItem}
        />
      </Grid>
    </section>
  );
};

interface CheckoutFlowProps {
  items: ReturnType<typeof selectCartItems>;
  allProducts: Parameters<typeof createCartAvailabilitySelector>[0];
  allowOutOfStockCheckout: boolean;
  shouldBlockCheckout: boolean;
  availabilityMessage: string;
}

const CheckoutFlow = ({
  items,
  allProducts,
  allowOutOfStockCheckout,
  shouldBlockCheckout,
  availabilityMessage,
}: CheckoutFlowProps) => {
  const navigate = useNavigate();
  const submissionInFlight = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [slipPreviewUrl, setSlipPreviewUrl] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const reduceMotion = useReducedMotion();
  const googleSheetsEnabled = isGoogleSheetsBackendEnabled();
  const {
    values,
    slipFile,
    errors,
    canSubmit,
    stepStatus,
    setField,
    validateField,
    setSlipFile,
    validateSlipFile,
    validateAll,
    setError,
  } = useCheckoutValidation({
    hasItems: items.length > 0,
    hasAvailabilityIssues: shouldBlockCheckout && items.length > 0,
    isSubmitting,
  });

  useEffect(() => {
    return () => {
      revokeSlipPreviewUrl(slipPreviewUrl);
    };
  }, [slipPreviewUrl]);

  const onSlipChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSlipFile(null);
      revokeSlipPreviewUrl(slipPreviewUrl);
      setSlipPreviewUrl('');
      return;
    }

    const preview = createSlipPreviewUrl(file);
    revokeSlipPreviewUrl(slipPreviewUrl);

    setSlipFile(file);
    setSlipPreviewUrl(preview);
  };

  const removeSlip = () => {
    setSlipFile(null);
    revokeSlipPreviewUrl(slipPreviewUrl);
    setSlipPreviewUrl('');
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { clearCart } = useCartStore.getState();
    const { pushToast } = useToastStore.getState();

    if (submissionInFlight.current) {
      return;
    }

    if (submitError) {
      setSubmitError('');
    }

    if (shouldBlockCheckout && items.length > 0) {
      const message = availabilityMessage;
      const cartErrors: CheckoutErrors = { cart: message };
      setError('cart', message);
      scrollToFirstError(cartErrors);
      pushToast('Please review your selection before checkout.', 'error');
      return;
    }

    if (items.length === 0) {
      const cartErrors: CheckoutErrors = {
        cart: 'Your cart is empty. Please add at least one fragrance.',
      };
      setError('cart', cartErrors.cart);
      scrollToFirstError(cartErrors);
      pushToast('Your selection is empty.', 'error');
      return;
    }

    const nextErrors = validateAll();

    if (Object.keys(nextErrors).length > 0 || !slipFile) {
      scrollToFirstError(nextErrors);
      pushToast('Please complete the highlighted checkout details.', 'error');
      return;
    }

    submissionInFlight.current = true;
    setIsSubmitting(true);

    try {
      const orderSubmissionService = createOrderSubmissionService({
        products: allProducts,
        allowOutOfStockCheckout,
      });
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
      void useProductCatalogStore.getState().refresh();
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
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="order-1 lg:col-start-1 lg:row-start-1">
        <span className="text-small font-bold uppercase tracking-wider text-brand-gold">
          Checkout
        </span>
        <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
          Complete <br />
          <span className="text-neutral-300">Your Order.</span>
        </h1>
        <p className="mt-8 max-w-xl text-body leading-7 text-on-light-secondary">
          Submit your details, choose your payment method, and upload payment proof so Dotfumes can
          review your order request.
        </p>
        <p className="mt-3 max-w-xl text-body leading-7 text-on-light-secondary">
          After submission, you can send a prefilled WhatsApp or email summary for faster
          confirmation.
        </p>

        <Grid cols={{ sm: 2 }} gap={2} className="mt-8" aria-label={checkoutContract.progressLabel}>
          {checkoutContract.steps.map((step) => (
            <Card
              key={step.id}
              variant="light"
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-caption uppercase tracking-wide transition-colors',
                stepStatus[step.id]
                  ? 'border-accent-muted bg-accent-gold-subtle text-brand-black'
                  : 'bg-surface-glass-strong text-on-light-secondary',
              )}
            >
              {stepStatus[step.id] ? (
                <CheckCircle2 size={13} className="shrink-0 text-brand-gold" />
              ) : (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-surface-overlay-muted"
                  aria-hidden="true"
                />
              )}
              {step.label}
            </Card>
          ))}
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
              exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
              transition={{
                duration: reduceMotion ? 0 : duration.fast,
                ease: easing.standard,
              }}
              className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-body text-red-700"
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
              exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
              transition={{
                duration: reduceMotion ? 0 : duration.fast,
                ease: easing.standard,
              }}
              className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-body text-red-700"
              role="alert"
            >
              <AlertTriangle size={16} className="mt-0.5" />
              <p>{submitError}</p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="space-y-8">
          <h2
            className={cn('text-small font-bold uppercase text-on-light-secondary', tracking.wide)}
          >
            {checkoutContract.steps[0].label}
          </h2>
          <Grid cols={{ md: 2 }} gap={5}>
            <CheckoutInput
              label={checkoutContract.fields.firstName.label}
              name={checkoutContract.fields.firstName.name}
              value={values.firstName}
              onChange={(value) => setField('firstName', value)}
              onBlur={() => validateField('firstName')}
              error={errors.firstName}
              autoComplete={checkoutContract.fields.firstName.autoComplete}
            />
            <CheckoutInput
              label={checkoutContract.fields.lastName.label}
              name={checkoutContract.fields.lastName.name}
              value={values.lastName}
              onChange={(value) => setField('lastName', value)}
              onBlur={() => validateField('lastName')}
              error={errors.lastName}
              autoComplete={checkoutContract.fields.lastName.autoComplete}
            />
            <CheckoutInput
              label={checkoutContract.fields.email.label}
              name={checkoutContract.fields.email.name}
              value={values.email}
              onChange={(value) => setField('email', value)}
              onBlur={() => validateField('email')}
              error={errors.email}
              type={checkoutContract.fields.email.type}
              autoComplete={checkoutContract.fields.email.autoComplete}
              required={checkoutContract.fields.email.required}
            />
            <CheckoutInput
              label={checkoutContract.fields.phone.label}
              name={checkoutContract.fields.phone.name}
              value={values.phone}
              onChange={(value) => setField('phone', value)}
              onBlur={() => validateField('phone')}
              error={errors.phone}
              type={checkoutContract.fields.phone.type}
              autoComplete={checkoutContract.fields.phone.autoComplete}
            />
            <div className="md:col-span-2">
              <CheckoutInput
                label={checkoutContract.fields.address.label}
                name={checkoutContract.fields.address.name}
                value={values.address}
                onChange={(value) => setField('address', value)}
                onBlur={() => validateField('address')}
                error={errors.address}
                autoComplete={checkoutContract.fields.address.autoComplete}
              />
            </div>
            <CheckoutInput
              label={checkoutContract.fields.city.label}
              name={checkoutContract.fields.city.name}
              value={values.city}
              onChange={(value) => setField('city', value)}
              onBlur={() => validateField('city')}
              error={errors.city}
              autoComplete={checkoutContract.fields.city.autoComplete}
            />
          </Grid>
        </div>

        <div className="space-y-8">
          <h2
            className={cn('text-small font-bold uppercase text-on-light-secondary', tracking.wide)}
          >
            2. Payment Method
          </h2>

          <Stack
            gap={3}
            className={cn(
              errors.paymentMethod && 'ring-1 ring-red-300 ring-offset-4 ring-offset-brand-white',
            )}
          >
            {checkoutContract.paymentMethods.map((option) => {
              const selected = values.paymentMethod === option.value;

              return (
                <label
                  key={option.value}
                  className={`cursor-pointer border px-4 py-4 transition-colors focus-within:ring-2 focus-within:ring-brand-gold focus-within:ring-offset-2 focus-within:ring-offset-brand-white ${
                    selected
                      ? 'border-brand-black bg-brand-black text-brand-white'
                      : 'border-on-light-muted bg-brand-white hover:border-on-light-strong'
                  }`}
                >
                  <input
                    type="radio"
                    name={checkoutContract.fields.paymentMethod.name}
                    className="sr-only"
                    value={option.value}
                    checked={selected}
                    onChange={(event) => setField('paymentMethod', event.target.value)}
                    onBlur={() => validateField('paymentMethod')}
                  />
                  <p className="text-small font-bold uppercase tracking-wide">{option.label}</p>
                  <p
                    className={`mt-2 text-label leading-5 ${
                      selected ? 'text-on-dark-secondary' : 'text-on-light-secondary'
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
          <h2
            className={cn('text-small font-bold uppercase text-on-light-secondary', tracking.wide)}
          >
            Payment Proof Upload
          </h2>

          <label
            className={cn(
              'block cursor-pointer border border-dashed bg-brand-white px-4 py-8 transition-colors hover:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold focus-within:ring-offset-2 focus-within:ring-offset-brand-white',
              errors.slip ? 'border-red-300 bg-red-50' : 'border-on-light-muted',
            )}
          >
            <input
              type="file"
              name={checkoutContract.slip.name}
              accept={checkoutContract.slip.accept.join(',')}
              className="sr-only"
              onChange={onSlipChange}
              onBlur={validateSlipFile}
            />
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-on-light-muted">
                <Upload size={16} />
              </div>
              <div>
                <p className="text-small font-bold uppercase tracking-wide">
                  Upload Slip (JPG / PNG / WEBP / PDF)
                </p>
                <p className="mt-1 text-label text-on-light-secondary">
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
                exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: easing.standard }}
                className="border border-on-light-muted p-4"
              >
                <p className="text-caption uppercase tracking-wide text-on-light-secondary">
                  Slip Preview
                </p>
                {slipPreviewUrl ? (
                  <AssetImage
                    src={slipPreviewUrl}
                    alt={`Slip preview ${slipFile.name}`}
                    wrapperClassName="mt-3 aspect-4/3 w-full bg-neutral-100"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="mt-3 flex aspect-4/3 w-full items-center justify-center bg-neutral-100 text-center text-label uppercase tracking-wide text-on-light-secondary">
                    PDF file selected
                  </div>
                )}
                <p className="mt-3 text-label text-on-light-secondary">
                  {slipFile.name} · {(slipFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="ghost"
                  onClick={removeSlip}
                  className="mt-3 flex min-h-11 items-center px-2 py-2 normal-case tracking-normal text-label uppercase tracking-wide text-on-light-secondary underline decoration-on-light-muted underline-offset-2 hover:text-brand-black md:min-h-0 md:px-0 md:py-0"
                >
                  Remove slip
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <Card
          variant="light"
          className="bg-brand-ivory px-4 py-4 text-label leading-6 text-on-light-secondary"
        >
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

        <Card variant="light">
          <p className="text-small font-bold uppercase tracking-wide text-on-light-secondary">
            What Happens Next
          </p>
          <ol className="mt-4 space-y-2 text-body leading-6 text-on-light-secondary">
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
          disabled={!canSubmit}
          className="w-full px-8 py-4 tracking-wider"
        >
          {isSubmitting
            ? googleSheetsEnabled
              ? checkoutContract.submission.submittingLabel
              : checkoutContract.submission.preparingLabel
            : checkoutContract.submission.label}
        </Button>
        <p
          className={cn('text-center text-caption uppercase text-on-light-muted', tracking.normal)}
        >
          Your order request is sent now. Dotfumes will contact you as early as possible.
        </p>
      </form>
    </>
  );
};

interface CheckoutSummaryProps {
  items: ReturnType<typeof selectCartItems>;
  totalItems: number;
  total: number;
  latestProductById: CartAvailability['productById'];
  availabilityIssueByItem: CartAvailability['availabilityIssueByItem'];
}

const CheckoutSummary = ({
  items,
  totalItems,
  total,
  latestProductById,
  availabilityIssueByItem,
}: CheckoutSummaryProps) => (
  <Card
    as="aside"
    variant="light"
    className="order-3 h-fit p-6 shadow-md lg:order-3 lg:col-start-2 lg:row-span-2 lg:sticky lg:top-28"
  >
    <h2 className="font-serif text-3xl italic">Your Selection</h2>
    <div className="mt-8 space-y-6">
      {items.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-small uppercase tracking-wide text-on-light-muted">
            Your selection is empty.
          </p>
          <Link
            to="/collection"
            className={cn(
              'mt-8 inline-flex border-b border-on-light-muted pb-1 text-caption uppercase',
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
            itemId={item.id}
            variant="checkout"
            stock={latestProductById.get(item.id)?.stock ?? item.stock}
            isUnavailable={availabilityIssueByItem.has(item.id)}
          />
        ))
      )}
    </div>

    <div className="mt-8 space-y-3 border-t border-on-light-muted pt-6">
      <div className="flex items-end justify-between">
        <span className="text-caption uppercase tracking-wider text-on-light-muted">Items</span>
        <span className="text-body text-on-light-secondary">{totalItems}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-caption uppercase tracking-wider text-on-light-muted">Subtotal</span>
        <span className="font-serif text-3xl italic">{formatCurrency(total)}</span>
      </div>
    </div>
  </Card>
);

const CheckoutInput = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string | undefined;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) => (
  <label className="block">
    <span className="text-small uppercase tracking-wide text-on-light-secondary">{label}</span>
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
      onBlur={onBlur}
      className="mt-3 py-4"
    />
    {error ? <FieldError message={error} id={`${name}-error`} /> : null}
  </label>
);

const FieldError = ({ message, id }: { message: string; id?: string }) => (
  <p id={id} className="mt-2 text-label text-red-600" role="alert">
    {message}
  </p>
);
