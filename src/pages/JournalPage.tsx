import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

const entries = [
  {
    title: 'Scent Study',
    description: 'Draft notes from the house on notes, texture, and daily wear mood.',
  },
  {
    title: 'Ritual Guides',
    description: 'Simple layering and application rituals curated for Dotfumes customers.',
  },
  {
    title: 'Behind the Bottle',
    description: 'Short stories about our visual direction and fragrance personality.',
  },
];

export const JournalPage = () => {
  usePageMeta({
    title: 'Journal | DOTFUMES',
    description: 'A curated Dotfumes journal of scent stories, rituals, and house notes.',
    path: '/journal',
  });

  return (
    <section className="min-h-screen bg-brand-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-36 md:px-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">The House</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Journal
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          A living notebook from Dotfumes. New entries are released in small editions to keep each
          story intentional.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {entries.map((entry) => (
            <article key={entry.title} className="border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/88">
                {entry.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/70">{entry.description}</p>
              <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-white/45">Opening soon</p>
            </article>
          ))}
        </div>

        <div className="mt-12 border border-white/10 bg-black/35 px-6 py-6 sm:flex sm:items-center sm:justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">
            Need immediate order support? Use contact for payment and delivery coordination.
          </p>
          <Link
            to="/contact"
            className="mt-5 inline-flex border border-brand-gold/45 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] transition-colors hover:bg-brand-gold hover:text-black sm:mt-0"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </section>
  );
};
