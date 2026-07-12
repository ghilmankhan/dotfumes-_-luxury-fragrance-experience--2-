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
    <section className="min-h-screen bg-brand-black text-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">The House</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Journal
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          A living notebook from Dotfumes. New entries are released in small editions to keep each
          story intentional.
        </p>

        <Grid cols={{ md: 3 }} gap={5} className="mt-12">
          {entries.map((entry) => (
            <Card as="article" key={entry.title} variant="dark" className="p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/88">
                {entry.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/70">{entry.description}</p>
              <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-white/45">Opening soon</p>
            </Card>
          ))}
        </Grid>

        <Card variant="dark" className="mt-12 bg-black/35 px-6 py-6 sm:flex sm:items-center sm:justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">
            Need immediate order support? Use contact for payment and delivery coordination.
          </p>
          <LinkButton
            to="/contact"
            variant="secondary"
            className="mt-5 text-[11px] tracking-[0.22em] sm:mt-0"
          >
            Contact Support
          </LinkButton>
        </Card>
      </Container>
    </section>
  );
};
