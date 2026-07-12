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
    <section className="min-h-screen bg-brand-black text-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">The House</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Sustainability
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          Dotfumes focuses on practical, small-business actions that improve order care and reduce
          avoidable waste.
        </p>

        <Grid cols={{ md: 3 }} gap={5} className="mt-12">
          {practices.map((practice) => (
            <Card as="article" key={practice.title} variant="dark" className="p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/90">
                {practice.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/70">{practice.detail}</p>
            </Card>
          ))}
        </Grid>

        <Card variant="dark" className="mt-12 bg-black/35 px-6 py-6 sm:flex sm:items-center sm:justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">
            Questions about packaging or handling? Reach support before placing your order.
          </p>
          <LinkButton
            to="/contact"
            variant="secondary"
            className="mt-5 text-[11px] tracking-[0.22em] sm:mt-0"
          >
            Contact Team
          </LinkButton>
        </Card>
      </Container>
    </section>
  );
};
