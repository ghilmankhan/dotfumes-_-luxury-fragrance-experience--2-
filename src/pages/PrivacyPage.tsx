import { usePageMeta } from '../hooks/usePageMeta';
import { Card } from '../components/ui/primitives/Card';
import { Grid } from '../components/ui/layout/Grid';
import { Container } from '../components/ui/layout/Container';
import { LinkButton } from '../components/ui/primitives/Button';

const privacyPoints = [
  {
    title: 'Order Information',
    detail:
      'Name, contact details, address, and cart items are used to process and coordinate your order.',
  },
  {
    title: 'Payment Slip Review',
    detail:
      'Uploaded payment proof is used only for manual verification and order support records.',
  },
  {
    title: 'Support Communication',
    detail:
      'WhatsApp and email details are used to confirm verification and share delivery coordination updates.',
  },
];

export const PrivacyPage = () => {
  usePageMeta({
    title: 'Privacy | DOTFUMES',
    description: 'How Dotfumes handles customer order and contact information.',
    path: '/privacy',
  });

  return (
    <section className="min-h-screen bg-brand-black text-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">Policy</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Privacy
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          This page explains how Dotfumes uses customer information to process orders and provide
          support.
        </p>

        <Grid cols={{ md: 3 }} gap={5} className="mt-12">
          {privacyPoints.map((point) => (
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
            Need clarification about your order details? Support can help.
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
