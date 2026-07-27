import { usePageMeta } from '../hooks/usePageMeta';
import { Card } from '../components/ui/primitives/Card';
import { Container } from '../components/ui/layout/Container';
import { LinkButton } from '../components/ui/primitives/Button';

const roles = [
  'Retail partnerships and customer support',
  'Creative production and visual storytelling',
  'Operations support for order coordination',
];

export const CareersPage = () => {
  usePageMeta({
    title: 'Careers | DOTFUMES',
    description: 'Career interest page for Dotfumes house operations and creative roles.',
    path: '/careers',
  });

  return (
    <section className="min-h-screen bg-brand-black text-brand-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-small font-bold uppercase tracking-wider text-brand-gold">The House</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
          Careers
        </h1>
        <p className="mt-8 max-w-3xl text-body leading-8 text-on-dark-secondary">
          Dotfumes grows in focused steps. If you want to work with us, share your profile and area
          of interest with the team.
        </p>

        <Card variant="dark" padding="comfortable" className="mt-12">
          <h2 className="text-small font-bold uppercase tracking-wide text-on-dark-strong">
            Current focus areas
          </h2>
          <ul className="mt-6 space-y-3 text-body leading-7 text-on-dark-secondary">
            {roles.map((role) => (
              <li key={role} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                <span>{role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-caption uppercase tracking-wide text-on-dark-muted">
            Openings are reviewed based on active business needs.
          </p>
        </Card>

        <Card
          variant="dark"
          className="mt-12 bg-surface-overlay-muted px-6 py-6 sm:flex sm:items-center sm:justify-between"
        >
          <p className="text-small uppercase tracking-wide text-on-dark-secondary">
            Send your profile and portfolio to begin a conversation.
          </p>
          <LinkButton
            to="/contact"
            variant="secondary"
            className="mt-4 text-small tracking-wide sm:mt-0"
          >
            Contact Dotfumes
          </LinkButton>
        </Card>
      </Container>
    </section>
  );
};
