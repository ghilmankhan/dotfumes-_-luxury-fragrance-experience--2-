import { usePageMeta } from '../hooks/usePageMeta';
import { Card } from '../components/ui/primitives/Card';
import { Grid } from '../components/ui/layout/Grid';
import { Container } from '../components/ui/layout/Container';
import { LinkButton } from '../components/ui/primitives/Button';

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
    <section className="min-h-screen bg-brand-black text-brand-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-small font-bold uppercase tracking-wider text-brand-gold">Assist</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
          Returns & Exchanges
        </h1>
        <p className="mt-8 max-w-3xl text-body leading-8 text-on-dark-secondary">
          Dotfumes resolves return and exchange requests through direct support with case-by-case
          review.
        </p>

        <Grid cols={{ md: 3 }} gap={5} className="mt-12">
          {returnSteps.map((step) => (
            <Card as="article" key={step.title} variant="dark" padding="comfortable">
              <h2 className="text-heading font-semibold text-on-dark-strong">{step.title}</h2>
              <p className="mt-4 text-body leading-7 text-on-dark-secondary">{step.detail}</p>
            </Card>
          ))}
        </Grid>

        <div className="mt-10 border border-on-dark-subtle bg-surface-overlay-muted p-6">
          <p className="text-body leading-8 text-on-dark-secondary">
            For the fastest review, include photos where relevant and contact support as soon as
            your order arrives.
          </p>
        </div>

        <Card
          variant="dark"
          className="mt-12 bg-surface-overlay-muted px-6 py-6 sm:flex sm:items-center sm:justify-between"
        >
          <p className="text-small text-on-dark-secondary">
            Need help with an active order? Contact support with your order ID.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 sm:mt-0">
            <LinkButton to="/contact" variant="secondary" className="text-small tracking-wide">
              Reach Support
            </LinkButton>
            <LinkButton
              to="/faq"
              variant="outline"
              className="border-on-dark-muted px-6 py-3 text-small tracking-wide text-on-dark-secondary hover:border-brand-white hover:bg-transparent hover:text-brand-white"
            >
              View FAQ
            </LinkButton>
          </div>
        </Card>
      </Container>
    </section>
  );
};
