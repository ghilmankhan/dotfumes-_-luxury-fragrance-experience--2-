import { usePageMeta } from '../hooks/usePageMeta';
import { LinkButton } from '../components/ui/primitives/Button';

export const NotFoundPage = () => {
  usePageMeta({
    title: 'Page Not Found | DOTFUMES',
    description: 'The page you requested could not be found.',
    path: '/not-found',
  });

  return (
    <section className="min-h-screen bg-brand-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 pt-32 pb-20 md:px-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">Error 404</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          This page
          <br />
          <span className="text-white/58">has drifted away.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-sm leading-8 text-white/72">
          The link may be outdated, or the page may have moved. Continue browsing the collection
          from the house archive below.
        </p>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
          <LinkButton
            to="/"
            variant="secondary"
            className="w-fit px-9 py-5 tracking-[0.35em]"
          >
            Return Home
          </LinkButton>
          <LinkButton
            to="/collection"
            variant="outline"
            className="w-fit border-white/20 px-9 py-5 tracking-[0.35em] text-white hover:border-white hover:bg-white hover:text-black"
          >
            Explore Collection
          </LinkButton>
        </div>
      </div>
    </section>
  );
};
