import { usePageMeta } from '../hooks/usePageMeta';
import { Card } from '../components/ui/primitives/Card';
import { Grid } from '../components/ui/layout/Grid';
import { Container } from '../components/ui/layout/Container';
import { LinkButton } from '../components/ui/primitives/Button';

const practices = [
  {
    title: 'Small-Batch Coordination',
    detail: 'Orders are coordinated in controlled volumes to reduce avoidable overstock and waste.',
  },
  {
    title: 'Careful Packaging Handling',
    detail:
      'Packaging and product handling are reviewed during confirmation to keep orders clean and protected.',
  },
  {
    title: 'Support-Led Resolution',
    detail:
      'If something is wrong, support works directly with customers to resolve issues with minimal back-and-forth.',
  },
];

export const SustainabilityPage = () => {
  usePageMeta({
    title: 'Sustainability | DOTFUMES',
    description: 'How Dotfumes approaches practical, small-batch operations and order care.',
    path: '/sustainability',
  });

  return (
    <section className="min-h-screen bg-brand-black text-brand-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-small font-bold uppercase tracking-wider text-brand-gold">The House</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
          Sustainability
        </h1>
        <p className="mt-8 max-w-3xl text-body leading-8 text-on-dark-secondary">
          Dotfumes focuses on practical, small-business actions that improve order care and reduce
          avoidable waste.
        </p>

        <Grid cols={{ md: 3 }} gap={5} className="mt-12">
          {practices.map((practice) => (
            <Card as="article" key={practice.title} variant="dark" padding="comfortable">
              <h2 className="text-small font-bold uppercase tracking-wide text-on-dark-strong">
                {practice.title}
              </h2>
              <p className="mt-4 text-body leading-7 text-on-dark-secondary">{practice.detail}</p>
            </Card>
          ))}
        </Grid>

        <Card
          variant="dark"
          className="mt-12 bg-surface-overlay-muted px-6 py-6 sm:flex sm:items-center sm:justify-between"
        >
          <p className="text-small uppercase tracking-wide text-on-dark-secondary">
            Questions about packaging or handling? Reach support before placing your order.
          </p>
          <LinkButton
            to="/contact"
            variant="secondary"
            className="mt-4 text-small tracking-wide sm:mt-0"
          >
            Contact Team
          </LinkButton>
        </Card>
      </Container>
    </section>
  );
};
