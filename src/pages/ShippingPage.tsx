import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

const shippingSteps = [
  {
    title: 'Order Submitted',
    detail:
      'Place your order and upload payment proof during checkout so the support team can begin review.',
  },
  {
    title: 'Manual Verification',
    detail:
      'Dotfumes verifies payment details before moving your order into delivery coordination.',
  },
  {
    title: 'Delivery Coordination',
    detail:
      'After confirmation, the team shares delivery guidance through WhatsApp or email.',
  },
];

export const ShippingPage = () => {
  usePageMeta({
    title: 'Shipping | DOTFUMES',
    description:
      'Shipping guidance for Dotfumes orders, including manual payment verification and delivery coordination.',
    path: '/shipping',
  });

  return (
    <section className="min-h-screen bg-brand-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-36 md:px-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">Assist</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Shipping
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          Dotfumes coordinates shipping after manual payment verification so each order can be
          confirmed with care.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {shippingSteps.map((step) => (
            <article key={step.title} className="border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/90">
                {step.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/72">{step.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 border border-white/10 bg-black/30 p-6">
          <p className="text-sm leading-8 text-white/75">
            Delivery timing can vary by city and order window. Contact support if you need a
            location-specific estimate before placing your order.
          </p>
        </div>

        <div className="mt-12 border border-white/10 bg-black/35 px-6 py-6 sm:flex sm:items-center sm:justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">
            Need help before checkout? Support is available on WhatsApp and email.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
            <Link
              to="/contact"
              className="inline-flex border border-brand-gold/40 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] transition-colors hover:bg-brand-gold hover:text-black"
            >
              Contact Support
            </Link>
            <Link
              to="/collection"
              className="inline-flex border border-white/20 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/78 transition-colors hover:border-white hover:text-white"
            >
              Explore Collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
