import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

const returnSteps = [
  {
    title: 'Share Order Details',
    detail:
      'Send your order ID and a short description of the issue so support can review quickly.',
  },
  {
    title: 'Case Review',
    detail:
      'The team checks product condition and order confirmation details before suggesting the next step.',
  },
  {
    title: 'Guided Resolution',
    detail:
      'Support will coordinate exchange or return guidance based on the approved case outcome.',
  },
];

export const ReturnsPage = () => {
  usePageMeta({
    title: 'Returns & Exchanges | DOTFUMES',
    description: 'Returns and exchange support for Dotfumes orders.',
    path: '/returns',
  });

  return (
    <section className="min-h-screen bg-brand-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-36 md:px-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">Assist</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Returns & Exchanges
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          Dotfumes resolves return and exchange requests through direct support with case-by-case
          review.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {returnSteps.map((step) => (
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
            For the fastest review, include photos where relevant and contact support as soon as your
            order arrives.
          </p>
        </div>

        <div className="mt-12 border border-white/10 bg-black/35 px-6 py-6 sm:flex sm:items-center sm:justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">
            Need help with an active order? Contact support with your order ID.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
            <Link
              to="/contact"
              className="inline-flex border border-brand-gold/40 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] transition-colors hover:bg-brand-gold hover:text-black"
            >
              Reach Support
            </Link>
            <Link
              to="/faq"
              className="inline-flex border border-white/20 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white/78 transition-colors hover:border-white hover:text-white"
            >
              View FAQ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
