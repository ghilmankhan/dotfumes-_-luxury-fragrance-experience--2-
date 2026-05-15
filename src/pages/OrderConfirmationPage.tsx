import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, MessageCircle, Mail } from 'lucide-react';
import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { readLatestOrder } from '../lib/storage';
import {
  buildOrderEmailUrl,
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
    title: 'Order Confirmed | DOTFUMES',
    description: 'Your DOTFUMES order details and payment slip handoff are ready.',
    path: '/order-confirmation',
    robots: 'noindex,nofollow',
  });

  const actions = useMemo(() => {
    if (!order) {
      return null;
    }

    return {
      whatsappUrl: buildWhatsAppOrderUrl(order),
      emailUrl: buildOrderEmailUrl(order),
    };
  }, [order]);

  if (!order) {
    return <Navigate to="/checkout" replace />;
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
            <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Order Confirmed</span>
          </div>

          <h1 className="mt-6 font-serif text-5xl italic leading-[0.9] md:text-7xl">
            Thank you for <br />
            <span className="text-white/45">your selection.</span>
          </h1>

          <p className="mt-8 max-w-xl text-sm leading-7 text-white/60">
            Your order details are ready with payment reference. Open one of the handoff options
            below and send the prefilled message so the DOTFUMES team can verify payment.
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
            <a
              href={actions?.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-white px-6 py-4 text-[10px] font-bold uppercase tracking-[0.32em] text-black transition-colors hover:bg-brand-gold"
            >
              <MessageCircle size={15} strokeWidth={1.6} />
              Send to WhatsApp
            </a>
            <a
              href={actions?.emailUrl}
              className="inline-flex items-center justify-center gap-3 border border-white/20 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.32em] text-white transition-colors hover:border-brand-gold hover:text-brand-gold"
            >
              <Mail size={15} strokeWidth={1.6} />
              Send by Email
            </a>
          </div>

          <p className="mt-4 text-xs leading-6 text-white/45">
            WhatsApp and email open with your details prefilled. Please review and tap send to
            complete the handoff.
          </p>

          <p className="mt-6 text-[10px] uppercase tracking-[0.26em] text-white/40">
            {order.submissionMode === 'google-sheets'
              ? 'Order synced to Google Sheets desk. Payment review usually completes within one business day.'
              : 'Private handoff mode active. Payment verification starts after you send the handoff message.'}
          </p>

          <Link
            to="/collection"
            className="mt-10 inline-flex border-b border-white/30 pb-1 text-[10px] uppercase tracking-[0.28em] text-white/70 transition-colors hover:text-white"
          >
            Continue Exploring
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
                    Qty {item.quantity}
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
