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
    <section className="min-h-screen bg-brand-black text-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">Policy</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Terms
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          These terms outline the core storefront process for orders, confirmation, and support.
        </p>

        <Grid cols={{ md: 3 }} gap={5} className="mt-12">
          {termPoints.map((point) => (
            <Card as="article" key={point.title} variant="dark" className="p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/90">
                {point.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/72">{point.detail}</p>
            </Card>
          ))}
        </Grid>

        <Card variant="dark" className="mt-12 bg-black/35 px-6 py-6 sm:flex sm:items-center sm:justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">
            For order-specific clarification, contact support before or after checkout.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
            <LinkButton
              to="/contact"
              variant="secondary"
              className="text-[11px] tracking-[0.22em]"
            >
              Contact Support
            </LinkButton>
            <LinkButton
              to="/checkout"
              variant="outline"
              className="border-white/20 px-6 py-3 text-[11px] tracking-[0.22em] text-white/78 hover:border-white hover:bg-transparent hover:text-white"
            >
              Return to Checkout
            </LinkButton>
          </div>
        </Card>
      </Container>
    </section>
  );
};
