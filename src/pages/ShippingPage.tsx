import { usePageMeta } from '../hooks/usePageMeta';
import { Card } from '../components/ui/primitives/Card';
import { Grid } from '../components/ui/layout/Grid';
import { Container } from '../components/ui/layout/Container';
import { LinkButton } from '../components/ui/primitives/Button';

const shippingSteps = [
  {
    title: 'Order Submitted',
    detail:
      'Place your order and upload payment proof during checkout so the support team can begin review.',
  },
  {
    title: 'Manual Verification',
    detail:
      'Dotfumes verifies payment details before moving your order into delivery coordination.',
  },
  {
    title: 'Delivery Coordination',
    detail: 'After confirmation, the team shares delivery guidance through WhatsApp or email.',
  },
];

export const ShippingPage = () => {
  usePageMeta({
    title: 'Shipping | DOTFUMES',
    description:
      'Shipping guidance for Dotfumes orders, including manual payment verification and delivery coordination.',
    path: '/shipping',
  });

  return (
    <section className="min-h-screen bg-brand-black text-brand-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-small font-bold uppercase tracking-wider text-brand-gold">Assist</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
          Shipping
        </h1>
        <p className="mt-8 max-w-3xl text-body leading-8 text-on-dark-secondary">
          Dotfumes coordinates shipping after manual payment verification so each order can be
          confirmed with care.
        </p>

        <Grid cols={{ md: 3 }} gap={5} className="mt-12">
          {shippingSteps.map((step) => (
            <Card as="article" key={step.title} variant="dark" padding="comfortable">
              <h2 className="text-small font-bold uppercase tracking-wide text-on-dark-strong">
                {step.title}
              </h2>
              <p className="mt-4 text-body leading-7 text-on-dark-secondary">{step.detail}</p>
            </Card>
          ))}
        </Grid>

        <div className="mt-10 border border-on-dark-subtle bg-surface-overlay-muted p-6">
          <p className="text-body leading-8 text-on-dark-secondary">
            Delivery timing can vary by city and order window. Contact support if you need a
            location-specific estimate before placing your order.
          </p>
        </div>

        <Card
          variant="dark"
          className="mt-12 bg-surface-overlay-muted px-6 py-6 sm:flex sm:items-center sm:justify-between"
        >
          <p className="text-small uppercase tracking-wide text-on-dark-secondary">
            Need help before checkout? Support is available on WhatsApp and email.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 sm:mt-0">
            <LinkButton to="/contact" variant="secondary" className="text-small tracking-wide">
              Contact Support
            </LinkButton>
            <LinkButton
              to="/collection"
              variant="outline"
              className="border-on-dark-muted px-6 py-3 text-small tracking-wide text-on-dark-secondary hover:border-brand-white hover:bg-transparent hover:text-brand-white"
            >
              Explore Collection
            </LinkButton>
          </div>
        </Card>
      </Container>
    </section>
  );
};
