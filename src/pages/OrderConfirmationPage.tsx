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
      <section className="min-h-screen bg-brand-black px-6 pb-24 pt-32 text-white md:px-16 lg:px-24">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
          className="mx-auto w-full max-w-4xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-10"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold">
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

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Link
              to="/checkout"
              className="inline-flex items-center justify-center border border-white/20 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white transition-colors hover:border-brand-gold hover:text-brand-gold"
            >
              Return to Checkout
            </Link>
            <Link
              to="/collection"
              className="inline-flex items-center justify-center border border-white/20 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white transition-colors hover:border-brand-gold hover:text-brand-gold"
            >
              Explore Collection
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center border border-white/20 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white transition-colors hover:border-brand-gold hover:text-brand-gold"
            >
              Contact Support
            </Link>
          </div>
        </motion.div>
      </section>
    );
  }
  const hasRemoteSlipUrl = order.slip.referenceUrl.startsWith('http');

  return (
    <section className="min-h-screen bg-brand-black px-6 pb-24 pt-32 text-white md:px-16 lg:px-24">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: 'easeOut' }}
        className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <article className="border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)] md:p-10">
          <div className="flex items-center gap-3 text-brand-gold">
            <CheckCircle2 size={18} strokeWidth={1.6} />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Order Request Received</span>
          </div>

          <h1 className="mt-6 font-serif text-5xl italic leading-[0.9] md:text-7xl">
            We received <br />
            <span className="text-white/45">your order request.</span>
          </h1>

          <p className="mt-8 max-w-xl text-sm leading-7 text-white/60">
            Thank you for choosing Dotfumes. We will review your order and contact you as early as
            possible through WhatsApp or email for confirmation and delivery coordination.
          </p>

          <div className="mt-10 grid gap-4 text-xs uppercase tracking-[0.24em] text-white/50 sm:grid-cols-2">
            <div className="border border-white/10 px-4 py-5">
              <p className="text-[9px]">Order ID</p>
              <p className="mt-2 text-[11px] text-white">{order.orderId}</p>
            </div>
            <div className="border border-white/10 px-4 py-5">
              <p className="text-[9px]">Payment</p>
              <p className="mt-2 text-[11px] text-white">
                {formatPaymentMethodLabel(order.paymentMethod)}
              </p>
            </div>
            <div className="border border-white/10 px-4 py-5 sm:col-span-2">
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
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {actions?.whatsappUrl ? (
              <a
                href={actions.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-3 bg-white px-6 py-4 text-[10px] font-bold uppercase tracking-[0.32em] text-black transition-colors hover:bg-brand-gold"
              >
                <MessageCircle size={15} strokeWidth={1.6} />
                Send Order on WhatsApp
              </a>
            ) : (
              <div className="inline-flex items-center justify-center border border-white/20 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                WhatsApp support link unavailable
              </div>
            )}
            {actions?.emailUrl ? (
              <a
                href={actions.emailUrl}
                className="inline-flex items-center justify-center gap-3 border border-white/20 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.32em] text-white transition-colors hover:border-brand-gold hover:text-brand-gold"
              >
                <Mail size={15} strokeWidth={1.6} />
                Send by Email
              </a>
            ) : (
              <div className="inline-flex items-center justify-center border border-white/20 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                Email support link unavailable
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <p className="max-w-2xl text-xs leading-6 text-white/45">
              Your order request has been received. For faster confirmation, open WhatsApp and send
              the prefilled summary to the Dotfumes team.
            </p>
            {canCopySummary ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(summaryForCopy);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2200);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="inline-flex items-center gap-2 border border-white/25 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:border-white/50"
              >
                {copied ? <Check size={13} strokeWidth={1.6} /> : <Copy size={13} strokeWidth={1.6} />}
                {copied ? 'Copied' : 'Copy Order Summary'}
              </button>
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
        </article>

        <aside className="border border-white/10 bg-white/[0.03] p-7 md:p-8">
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
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/45">Subtotal</p>
              <p className="text-sm text-white/65">{formatCurrency(order.subtotal)}</p>
            </div>
            <div className="mb-3 flex items-end justify-between">
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/45">Delivery</p>
              <p className="text-sm text-white/65">{formatCurrency(order.deliveryFee)}</p>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/45">Total</p>
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
        </aside>
      </motion.div>
    </section>
  );
};
