import { CheckCircle2, MessageCircle, Mail, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { readLatestOrder } from '../lib/storage';
import {
  buildOrderEmailUrl,
  buildWhatsAppMessage,
  buildWhatsAppOrderUrl,
  formatCurrency,
  formatPaymentMethodLabel,
} from '../lib/order';
import { AssetImage } from '../components/AssetImage';
import { usePageMeta } from '../hooks/usePageMeta';
import { Button, LinkButton, buttonClasses } from '../components/ui/primitives/Button';
import { Card } from '../components/ui/primitives/Card';
import { Grid } from '../components/ui/layout/Grid';
import { easing, duration } from '../styles/tokens/motion';
import { headingMd, headingXs, tracking } from '../styles/tokens/typography';
import { cn } from '../lib/utils';

export const OrderConfirmationPage = () => {
  const order = readLatestOrder();
  const reduceMotion = useReducedMotion() ?? false;

  usePageMeta({
    title: 'Order Request Received | DOTFUMES',
    description: 'Your DOTFUMES order request has been received for manual review.',
    path: '/order-confirmation',
    robots: 'noindex,nofollow',
  });
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const actions = order
    ? {
        whatsappUrl: buildWhatsAppOrderUrl(order),
        emailUrl: buildOrderEmailUrl(order),
      }
    : null;
  const summaryForCopy = order ? buildWhatsAppMessage(order) : '';

  const canCopySummary = Boolean(order) && Boolean(summaryForCopy) && typeof window !== 'undefined';

  if (!order) {
    return (
      <section className="min-h-screen bg-brand-black px-6 pb-24 pt-36 text-brand-white md:px-16 lg:px-24">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.42, ease: easing.standard }}
          className="gradient-surface mx-auto w-full max-w-4xl border border-on-dark-subtle p-8 shadow-lg md:p-10"
        >
          <p className={cn('text-caption font-bold uppercase text-brand-gold', tracking.wider)}>
            Order Archive
          </p>
          <h1 className="mt-6 font-serif text-5xl italic leading-none md:text-7xl">
            No recent order <br />
            <span className="text-on-dark-muted">was found.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-body leading-7 text-on-dark-secondary">
            Confirmation details appear here right after checkout. If you already placed an order,
            contact support with your name and payment method so the team can assist.
          </p>

          <Grid cols={{ sm: 3 }} className="mt-10">
            <LinkButton
              to="/checkout"
              variant="outline"
              className={cn(
                'border-on-dark-muted px-6 py-4 text-brand-white hover:border-brand-gold hover:bg-transparent hover:text-brand-gold',
                tracking.wide,
              )}
            >
              Return to Checkout
            </LinkButton>
            <LinkButton
              to="/collection"
              variant="outline"
              className={cn(
                'border-on-dark-muted px-6 py-4 text-brand-white hover:border-brand-gold hover:bg-transparent hover:text-brand-gold',
                tracking.wide,
              )}
            >
              Explore Collection
            </LinkButton>
            <LinkButton
              to="/contact"
              variant="outline"
              className={cn(
                'border-on-dark-muted px-6 py-4 text-brand-white hover:border-brand-gold hover:bg-transparent hover:text-brand-gold',
                tracking.wide,
              )}
            >
              Contact Support
            </LinkButton>
          </Grid>
        </motion.div>
      </section>
    );
  }
  const hasRemoteSlipUrl = order.slip.referenceUrl.startsWith('http');

  return (
    <section className="min-h-screen bg-brand-black px-6 pb-24 pt-36 text-brand-white md:px-16 lg:px-24">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0 : duration.moderate,
          ease: easing.standard,
        }}
        className="grid-layout-media-copy mx-auto grid w-full max-w-6xl gap-10"
      >
        <Card as="article" variant="dark" className="gradient-surface p-8 shadow-lg md:p-10">
          <div className="flex items-center gap-3 text-brand-gold">
            <CheckCircle2 aria-hidden="true" size={18} strokeWidth={1.6} />
            <span className={cn('text-caption font-bold uppercase', tracking.wider)}>
              Order Request Received
            </span>
          </div>

          {order.submissionMode !== 'google-sheets' ? (
            <p
              className={cn(
                'mt-4 inline-block border border-status-warning bg-status-warning-surface px-3 py-1.5 text-caption uppercase text-amber-200',
                tracking.normal,
              )}
            >
              Order stored locally only — not yet synced to backend system
            </p>
          ) : null}

          <h1 className="mt-6 font-serif text-5xl italic leading-none md:text-7xl">
            We received <br />
            <span className="text-on-dark-muted">your order request.</span>
          </h1>

          <p className="mt-8 max-w-xl text-body leading-7 text-on-dark-secondary">
            Thank you for choosing Dotfumes. We will review your order and contact you as early as
            possible through WhatsApp or email for confirmation and delivery coordination.
          </p>

          <Grid
            cols={{ sm: 2 }}
            className="mt-10 text-label uppercase tracking-wide text-on-dark-muted"
          >
            <Card variant="dark" className="border-on-dark-subtle">
              <p>Order ID</p>
              <p className="mt-2 text-small text-brand-white">{order.orderId}</p>
            </Card>
            <Card variant="dark" className="border-on-dark-subtle">
              <p>Payment</p>
              <p className="mt-2 text-small text-brand-white">
                {formatPaymentMethodLabel(order.paymentMethod)}
              </p>
            </Card>
            <Card variant="dark" className="border-on-dark-subtle sm:col-span-2">
              <p>Slip Reference</p>
              {hasRemoteSlipUrl ? (
                <a
                  href={order.slip.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-small text-brand-white underline decoration-on-dark-muted underline-offset-2"
                >
                  {order.slip.referenceUrl}
                </a>
              ) : (
                <p className="mt-2 break-all text-small text-brand-white">
                  {order.slip.referenceUrl}
                </p>
              )}
            </Card>
          </Grid>

          <Grid cols={{ sm: 2 }} className="mt-10">
            {actions?.whatsappUrl ? (
              <a
                href={actions.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses('secondary')}
              >
                <MessageCircle aria-hidden="true" size={15} strokeWidth={1.6} />
                Send Order on WhatsApp
              </a>
            ) : (
              <div
                className={cn(
                  'inline-flex items-center justify-center border border-on-dark-muted px-6 py-4 text-caption font-bold uppercase text-on-dark-secondary',
                  tracking.normal,
                )}
              >
                WhatsApp support link unavailable
              </div>
            )}
            {actions?.emailUrl ? (
              <a
                href={actions.emailUrl}
                className={buttonClasses('outlineDark')}
              >
                <Mail aria-hidden="true" size={15} strokeWidth={1.6} />
                Send by Email
              </a>
            ) : (
              <div
                className={cn(
                  'inline-flex items-center justify-center border border-on-dark-muted px-6 py-4 text-caption font-bold uppercase text-on-dark-secondary',
                  tracking.normal,
                )}
              >
                Email support link unavailable
              </div>
            )}
          </Grid>

          <div className="mt-4 flex flex-wrap gap-3">
            <p className="max-w-2xl text-label leading-6 text-on-dark-muted">
              Your order request has been received. For faster confirmation, open WhatsApp and send
              the prefilled summary to the Dotfumes team.
            </p>
            {canCopySummary ? (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(summaryForCopy);
                    setCopyStatus('copied');
                  } catch {
                    setCopyStatus('error');
                  }
                }}
                className="gap-2 border-on-dark-muted px-4 py-2 font-semibold tracking-wide text-brand-white hover:border-on-dark-strong hover:bg-transparent"
              >
                {copyStatus === 'copied' ? (
                  <Check aria-hidden="true" size={13} strokeWidth={1.6} />
                ) : (
                  <Copy aria-hidden="true" size={13} strokeWidth={1.6} />
                )}
                {copyStatus === 'copied' ? 'Copied' : 'Copy Order Summary'}
              </Button>
            ) : null}
            <span className="sr-only" role="status" aria-live="polite">
              {copyStatus === 'copied'
                ? 'Order summary copied to clipboard.'
                : copyStatus === 'error'
                  ? 'Could not copy the order summary. Use WhatsApp or email instead.'
                  : ''}
            </span>
          </div>

          <p className="mt-2 text-label leading-6 text-on-dark-muted">
            {order.customer.email
              ? 'If you entered an email, a confirmation email has been sent.'
              : 'No email was provided. You can still use WhatsApp for confirmation.'}
          </p>

          <p className="mt-6 text-small text-on-dark-secondary">
            {order.submissionMode === 'google-sheets'
              ? 'Dotfumes reviews payment proof manually and confirms next steps soon.'
              : 'Please send the prefilled support message so Dotfumes can confirm your request.'}
          </p>

          <Link
            to="/collection"
            className="mt-10 inline-flex border-b border-on-dark-muted pb-1 text-label uppercase tracking-wide text-on-dark-secondary transition-colors hover:text-brand-white"
          >
            Continue Shopping
          </Link>
        </Card>

        <Card as="aside" variant="dark" padding="spacious" className="bg-surface-muted">
          <h2 className={headingMd}>Order Summary</h2>
          <div className="mt-8 space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-on-dark-subtle pb-4"
              >
                <div>
                  <p className={headingXs}>{item.name}</p>
                  <p className="mt-1 text-caption uppercase tracking-wide text-on-dark-muted">
                    {item.sku ? `${item.sku} · ` : ''}Qty {item.quantity}
                  </p>
                </div>
                <p className="text-body text-on-dark-secondary">{formatCurrency(item.lineTotal)}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-on-dark-subtle pt-4">
            <div className="mb-2 flex items-end justify-between">
              <p className={cn('text-caption uppercase text-on-dark-muted', tracking.wide)}>
                Subtotal
              </p>
              <p className="text-body text-on-dark-secondary">{formatCurrency(order.subtotal)}</p>
            </div>
            <div className="mb-3 flex items-end justify-between">
              <p className={cn('text-caption uppercase text-on-dark-muted', tracking.wide)}>
                Delivery
              </p>
              <p className="text-body text-on-dark-secondary">
                {formatCurrency(order.deliveryFee)}
              </p>
            </div>
            <div className="flex items-end justify-between">
              <p className={cn('text-caption uppercase text-on-dark-muted', tracking.wide)}>
                Total
              </p>
              <p className={headingMd}>{formatCurrency(order.total)}</p>
            </div>
          </div>

          <div className="mt-8 border border-on-dark-subtle p-4">
            <p className="text-caption uppercase tracking-wide text-on-dark-muted">Payment Slip</p>
            {order.slip.previewUrl ? (
              <AssetImage
                src={order.slip.previewUrl}
                alt={`Payment slip ${order.slip.fileName}`}
                wrapperClassName="mt-4 aspect-4/3 w-full bg-surface-overlay-muted"
                className="h-full w-full object-cover"
              />
            ) : (
              <p className="mt-3 text-label text-on-dark-muted">
                Preview unavailable for this file type or after reload. Use the slip reference link
                above.
              </p>
            )}
            <p className="mt-3 text-caption text-on-dark-muted">{order.slip.fileName}</p>
          </div>
        </Card>
      </motion.div>
    </section>
  );
};
