import { Link } from 'react-router-dom';
import { CheckCircle2, MessageCircle, Mail, Copy, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { tracking } from '../styles/tokens/typography';
import { cn } from '../lib/utils';

export const OrderConfirmationPage = () => {
  const order = readLatestOrder();
  const reduceMotion = useReducedMotion();

  usePageMeta({
    title: 'Order Request Received | DOTFUMES',
    description: 'Your DOTFUMES order request has been received for manual review.',
    path: '/order-confirmation',
    robots: 'noindex,nofollow',
  });
  const [copied, setCopied] = useState(false);

  const actions = useMemo(() => {
    if (!order) {
      return null;
    }

    return {
      whatsappUrl: buildWhatsAppOrderUrl(order),
      emailUrl: buildOrderEmailUrl(order),
    };
  }, [order]);
  const summaryForCopy = useMemo(() => {
    if (!order) {
      return '';
    }

    return buildWhatsAppMessage(order);
  }, [order]);

  const canCopySummary = Boolean(order) && Boolean(summaryForCopy) && typeof window !== 'undefined';

  if (!order) {
    return (
      <section className="min-h-screen bg-brand-black px-6 pb-24 pt-36 text-white md:px-16 lg:px-24">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: easing.standard }}
          className="mx-auto w-full max-w-4xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 shadow-lg md:p-10"
        >
          <p className={cn('text-[10px] font-bold uppercase text-brand-gold', tracking.wider)}>
            Order Archive
          </p>
          <h1 className="mt-6 font-serif text-5xl italic leading-[0.9] md:text-7xl">
            No recent order <br />
            <span className="text-white/45">was found.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-sm leading-7 text-white/60">
            Confirmation details appear here right after checkout. If you already placed an order,
            contact support with your name and payment method so the team can assist.
          </p>

          <Grid cols={{ sm: 3 }} className="mt-10">
            <LinkButton
              to="/checkout"
              variant="outline"
              className={cn(
                'border-white/20 px-6 py-4 text-white hover:border-brand-gold hover:bg-transparent hover:text-brand-gold',
                tracking.wide,
              )}
            >
              Return to Checkout
            </LinkButton>
            <LinkButton
              to="/collection"
              variant="outline"
              className={cn(
                'border-white/20 px-6 py-4 text-white hover:border-brand-gold hover:bg-transparent hover:text-brand-gold',
                tracking.wide,
              )}
            >
              Explore Collection
            </LinkButton>
            <LinkButton
              to="/contact"
              variant="outline"
              className={cn(
                'border-white/20 px-6 py-4 text-white hover:border-brand-gold hover:bg-transparent hover:text-brand-gold',
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
    <section className="min-h-screen bg-brand-black px-6 pb-24 pt-36 text-white md:px-16 lg:px-24">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: duration.moderate, ease: easing.standard }}
        className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <Card
          as="article"
          variant="dark"
          className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 shadow-lg md:p-10"
        >
          <div className="flex items-center gap-3 text-brand-gold">
            <CheckCircle2 size={18} strokeWidth={1.6} />
            <span className={cn('text-[10px] font-bold uppercase', tracking.wider)}>Order Request Received</span>
          </div>

          {order.submissionMode !== 'google-sheets' ? (
            <p
              className={cn(
                'mt-4 inline-block border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[10px] uppercase text-amber-200',
                tracking.normal,
              )}
            >
              Order stored locally only — not yet synced to backend system
            </p>
          ) : null}

          <h1 className="mt-6 font-serif text-5xl italic leading-[0.9] md:text-7xl">
            We received <br />
            <span className="text-white/45">your order request.</span>
          </h1>

          <p className="mt-8 max-w-xl text-sm leading-7 text-white/60">
            Thank you for choosing Dotfumes. We will review your order and contact you as early as
            possible through WhatsApp or email for confirmation and delivery coordination.
          </p>

          <Grid cols={{ sm: 2 }} className="mt-10 text-xs uppercase tracking-[0.24em] text-white/50">
            <Card variant="dark" className="border-white/10 px-4 py-5">
              <p className="text-[9px]">Order ID</p>
              <p className="mt-2 text-[11px] text-white">{order.orderId}</p>
            </Card>
            <Card variant="dark" className="border-white/10 px-4 py-5">
              <p className="text-[9px]">Payment</p>
              <p className="mt-2 text-[11px] text-white">
                {formatPaymentMethodLabel(order.paymentMethod)}
              </p>
            </Card>
            <Card variant="dark" className="border-white/10 px-4 py-5 sm:col-span-2">
              <p className="text-[9px]">Slip Reference</p>
              {hasRemoteSlipUrl ? (
                <a
                  href={order.slip.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-[11px] text-white underline decoration-white/40 underline-offset-2"
                >
                  {order.slip.referenceUrl}
                </a>
              ) : (
                <p className="mt-2 break-all text-[11px] text-white">{order.slip.referenceUrl}</p>
              )}
            </Card>
          </Grid>

          <Grid cols={{ sm: 2 }} className="mt-10">
            {actions?.whatsappUrl ? (
              <a
                href={actions.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses(
                  'primary',
                  'gap-3 bg-white px-6 py-4 text-black hover:bg-brand-gold',
                )}
              >
                <MessageCircle size={15} strokeWidth={1.6} />
                Send Order on WhatsApp
              </a>
            ) : (
              <div
                className={cn(
                  'inline-flex items-center justify-center border border-white/20 px-6 py-4 text-[10px] font-bold uppercase text-white/60',
                  tracking.normal,
                )}
              >
                WhatsApp support link unavailable
              </div>
            )}
            {actions?.emailUrl ? (
              <a
                href={actions.emailUrl}
                className={buttonClasses(
                  'outline',
                  'gap-3 border-white/20 px-6 py-4 text-white hover:border-brand-gold hover:bg-transparent hover:text-brand-gold',
                )}
              >
                <Mail size={15} strokeWidth={1.6} />
                Send by Email
              </a>
            ) : (
              <div
                className={cn(
                  'inline-flex items-center justify-center border border-white/20 px-6 py-4 text-[10px] font-bold uppercase text-white/60',
                  tracking.normal,
                )}
              >
                Email support link unavailable
              </div>
            )}
          </Grid>

          <div className="mt-4 flex flex-wrap gap-3">
            <p className="max-w-2xl text-xs leading-6 text-white/45">
              Your order request has been received. For faster confirmation, open WhatsApp and send
              the prefilled summary to the Dotfumes team.
            </p>
            {canCopySummary ? (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(summaryForCopy);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2200);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="gap-2 border-white/25 px-4 py-2 font-semibold tracking-[0.22em] text-white hover:border-white/50 hover:bg-transparent"
              >
                {copied ? <Check size={13} strokeWidth={1.6} /> : <Copy size={13} strokeWidth={1.6} />}
                {copied ? 'Copied' : 'Copy Order Summary'}
              </Button>
            ) : null}
          </div>

          <p className="mt-2 text-xs leading-6 text-white/45">
            {order.customer.email
              ? 'If you entered an email, a confirmation email has been sent.'
              : 'No email was provided. You can still use WhatsApp for confirmation.'}
          </p>

          <p className="mt-6 text-[10px] uppercase tracking-[0.26em] text-white/40">
            {order.submissionMode === 'google-sheets'
              ? 'Dotfumes reviews payment proof manually and confirms next steps soon.'
              : 'Please send the prefilled support message so Dotfumes can confirm your request.'}
          </p>

          <Link
            to="/collection"
            className="mt-10 inline-flex border-b border-white/30 pb-1 text-[10px] uppercase tracking-[0.28em] text-white/70 transition-colors hover:text-white"
          >
            Continue Shopping
          </Link>
        </Card>

        <Card as="aside" variant="dark" className="bg-white/[0.03] p-7 md:p-8">
          <h2 className="font-serif text-3xl italic">Order Summary</h2>
          <div className="mt-8 space-y-5">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="font-serif text-xl italic">{item.name}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.24em] text-white/45">
                    {item.sku ? `${item.sku} · ` : ''}Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm text-white/70">{formatCurrency(item.lineTotal)}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="mb-2 flex items-end justify-between">
              <p className={cn('text-[9px] uppercase text-white/45', tracking.wide)}>Subtotal</p>
              <p className="text-sm text-white/65">{formatCurrency(order.subtotal)}</p>
            </div>
            <div className="mb-3 flex items-end justify-between">
              <p className={cn('text-[9px] uppercase text-white/45', tracking.wide)}>Delivery</p>
              <p className="text-sm text-white/65">{formatCurrency(order.deliveryFee)}</p>
            </div>
            <div className="flex items-end justify-between">
              <p className={cn('text-[9px] uppercase text-white/45', tracking.wide)}>Total</p>
              <p className="font-serif text-3xl italic">{formatCurrency(order.total)}</p>
            </div>
          </div>

          <div className="mt-8 border border-white/10 p-4">
            <p className="text-[9px] uppercase tracking-[0.28em] text-white/45">Payment Slip</p>
            {order.slip.previewUrl ? (
              <AssetImage
                src={order.slip.previewUrl}
                alt={`Payment slip ${order.slip.fileName}`}
                wrapperClassName="mt-4 aspect-[4/3] w-full bg-black/40"
                className="h-full w-full object-cover"
              />
            ) : (
              <p className="mt-3 text-xs text-white/55">
                Preview unavailable for this file type or after reload. Use the slip reference link above.
              </p>
            )}
            <p className="mt-3 text-[10px] text-white/55">{order.slip.fileName}</p>
          </div>
        </Card>
      </motion.div>
    </section>
  );
};
