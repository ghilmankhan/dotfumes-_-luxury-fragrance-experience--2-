import { usePageMeta } from '../hooks/usePageMeta';
import { LinkButton } from '../components/ui/primitives/Button';

export const NotFoundPage = () => {
  usePageMeta({
    title: 'Page Not Found | DOTFUMES',
    description: 'The page you requested could not be found.',
    path: '/not-found',
  });

  return (
    <section className="min-h-screen bg-brand-black text-brand-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 pt-32 pb-20 md:px-16">
        <p className="text-small font-bold uppercase tracking-wider text-brand-gold">Error 404</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
          This page
          <br />
          <span className="text-on-dark-muted">has drifted away.</span>
        </h1>
        <p className="mt-8 max-w-2xl text-body leading-8 text-on-dark-secondary">
          The link may be outdated, or the page may have moved. Continue browsing the collection
          from the house archive below.
        </p>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
          <LinkButton to="/" variant="secondary" size="wide" className="w-fit">
            Return Home
          </LinkButton>
          <LinkButton
            to="/collection"
            variant="outline"
            className="w-fit border-on-dark-muted px-8 py-4 tracking-wider text-brand-white hover:border-brand-white hover:bg-brand-white hover:text-brand-black"
          >
            Explore Collection
          </LinkButton>
        </div>
      </div>
    </section>
  );
};
