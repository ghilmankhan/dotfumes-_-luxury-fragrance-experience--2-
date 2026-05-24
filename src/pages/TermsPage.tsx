import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

const termPoints = [
  {
    title: 'Manual Verification',
    detail:
      'Orders are reviewed with submitted customer details and payment proof before fulfillment moves forward.',
  },
  {
    title: 'Availability',
    detail:
      'Product availability may change based on active order confirmation volume. Support will guide next steps if stock shifts.',
  },
  {
    title: 'Customer Details',
    detail:
      'Accurate contact and delivery details are required to complete confirmation and coordinate dispatch.',
  },
];

export const TermsPage = () => {
  usePageMeta({
    title: 'Terms | DOTFUMES',
    description: 'Core storefront terms for Dotfumes orders and manual verification flow.',
    path: '/terms',
  });

  return (
    <section className="min-h-screen bg-brand-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-36 md:px-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">Policy</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Terms
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          These terms outline the core storefront process for orders, confirmation, and support.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {termPoints.map((point) => (
            <article key={point.title} className="border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/90">
                {point.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/72">{point.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 border border-white/10 bg-black/35 px-6 py-6 sm:flex sm:items-center sm:justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">
            For order-specific clarification, contact support before or after checkout.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
            <Link
              to="/contact"
              className="inline-flex border border-brand-gold/40 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] transition-colors hover:bg-brand-gold hover:text-black"
            >
              Contact Support
            </Link>
            <Link
              to="/checkout"
              className="inline-flex border border-white/20 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/78 transition-colors hover:border-white hover:text-white"
            >
              Return to Checkout
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
