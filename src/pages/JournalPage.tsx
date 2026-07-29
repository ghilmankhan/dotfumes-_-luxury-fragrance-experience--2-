import { usePageMeta } from '../hooks/usePageMeta';
import { Card } from '../components/ui/primitives/Card';
import { Grid } from '../components/ui/layout/Grid';
import { Container } from '../components/ui/layout/Container';
import { LinkButton } from '../components/ui/primitives/Button';

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
    <section className="min-h-screen bg-brand-black text-brand-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-small font-bold uppercase tracking-wider text-brand-gold">The House</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
          Journal
        </h1>
        <p className="mt-8 max-w-3xl text-body leading-8 text-on-dark-secondary">
          A living notebook from Dotfumes. New entries are released in small editions to keep each
          story intentional.
        </p>

        <Grid cols={{ md: 3 }} gap={5} className="mt-12">
          {entries.map((entry) => (
            <Card as="article" key={entry.title} variant="dark" padding="comfortable">
              <h2 className="text-heading font-semibold text-on-dark-secondary">{entry.title}</h2>
              <p className="mt-4 text-body leading-7 text-on-dark-secondary">{entry.description}</p>
              <p className="mt-6 text-caption uppercase tracking-wide text-on-dark-muted">
                Opening soon
              </p>
            </Card>
          ))}
        </Grid>

        <Card
          variant="dark"
          className="mt-12 bg-surface-overlay-muted px-6 py-6 sm:flex sm:items-center sm:justify-between"
        >
          <p className="text-small text-on-dark-secondary">
            Need immediate order support? Use contact for payment and delivery coordination.
          </p>
          <LinkButton
            to="/contact"
            variant="secondary"
            className="mt-4 text-small tracking-wide sm:mt-0"
          >
            Contact Support
          </LinkButton>
        </Card>
      </Container>
    </section>
  );
};
