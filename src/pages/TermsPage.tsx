import { usePageMeta } from '../hooks/usePageMeta';
import { Card } from '../components/ui/primitives/Card';
import { Grid } from '../components/ui/layout/Grid';
import { Container } from '../components/ui/layout/Container';
import { LinkButton } from '../components/ui/primitives/Button';

const termPoints = [
  {
    title: 'Manual Verification',
    detail:
      'Orders are reviewed with submitted customer details and payment proof before fulfillment moves forward.',
  },
  {
    title: 'Availability',
    detail:
      'Product availability may change based on active order confirmation volume. Support will guide next steps if stock shifts.',
  },
  {
    title: 'Customer Details',
    detail:
      'Accurate contact and delivery details are required to complete confirmation and coordinate dispatch.',
  },
];

export const TermsPage = () => {
  usePageMeta({
    title: 'Terms | DOTFUMES',
    description: 'Core storefront terms for Dotfumes orders and manual verification flow.',
    path: '/terms',
  });

  return (
    <section className="min-h-screen bg-brand-black text-brand-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-small font-bold uppercase tracking-wider text-brand-gold">Policy</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
          Terms
        </h1>
        <p className="mt-8 max-w-3xl text-body leading-8 text-on-dark-secondary">
          These terms outline the core storefront process for orders, confirmation, and support.
        </p>

        <Grid cols={{ md: 3 }} gap={5} className="mt-12">
          {termPoints.map((point) => (
            <Card as="article" key={point.title} variant="dark" padding="comfortable">
              <h2 className="text-heading font-semibold text-on-dark-strong">{point.title}</h2>
              <p className="mt-4 text-body leading-7 text-on-dark-secondary">{point.detail}</p>
            </Card>
          ))}
        </Grid>

        <Card
          variant="dark"
          className="mt-12 bg-surface-overlay-muted px-6 py-6 sm:flex sm:items-center sm:justify-between"
        >
          <p className="text-small text-on-dark-secondary">
            For order-specific clarification, contact support before or after checkout.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 sm:mt-0">
            <LinkButton to="/contact" variant="secondary" className="text-small tracking-wide">
              Contact Support
            </LinkButton>
            <LinkButton
              to="/checkout"
              variant="outline"
              className="border-on-dark-muted px-6 py-3 text-small tracking-wide text-on-dark-secondary hover:border-brand-white hover:bg-transparent hover:text-brand-white"
            >
              Return to Checkout
            </LinkButton>
          </div>
        </Card>
      </Container>
    </section>
  );
};
