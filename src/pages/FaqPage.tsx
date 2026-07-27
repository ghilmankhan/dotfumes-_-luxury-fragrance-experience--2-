import { usePageMeta } from '../hooks/usePageMeta';
import { Card } from '../components/ui/primitives/Card';
import { Container } from '../components/ui/layout/Container';
import { LinkButton } from '../components/ui/primitives/Button';

const faqs = [
  {
    question: 'How is payment verified?',
    answer:
      'After checkout, your uploaded payment slip is reviewed manually. Once verified, the order moves forward for delivery coordination.',
  },
  {
    question: 'Why do I need to upload a payment slip?',
    answer:
      'Slip upload helps the team match payment details with your order before confirmation and dispatch planning.',
  },
  {
    question: 'When will I receive order confirmation?',
    answer:
      'You receive confirmation after your order is submitted. Verification and delivery timing updates are shared by support.',
  },
  {
    question: 'How is delivery arranged?',
    answer:
      'Delivery is coordinated after payment verification. Contact support for exact delivery timing in your area.',
  },
  {
    question: 'Can I send my order summary by WhatsApp or email?',
    answer:
      'Yes. After checkout, you can open a prefilled WhatsApp or email summary so support can confirm your order faster.',
  },
];

export const FaqPage = () => {
  usePageMeta({
    title: 'FAQ | DOTFUMES',
    description: 'Answers about checkout, payment proof verification, and order confirmation.',
    path: '/faq',
  });

  return (
    <section className="min-h-screen bg-brand-black text-brand-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-small font-bold uppercase tracking-wider text-brand-gold">Assist</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-8 max-w-3xl text-body leading-8 text-on-dark-secondary">
          Quick answers about payment proof, manual verification, and order coordination.
        </p>

        <div className="mt-12 space-y-6">
          {faqs.map((faq) => (
            <Card as="article" key={faq.question} variant="dark" padding="comfortable">
              <h2 className="text-small font-bold uppercase tracking-wide text-on-dark-strong">
                {faq.question}
              </h2>
              <p className="mt-4 text-body leading-7 text-on-dark-secondary">{faq.answer}</p>
            </Card>
          ))}
        </div>

        <Card
          variant="dark"
          className="mt-12 bg-surface-overlay-muted px-6 py-6 sm:flex sm:items-center sm:justify-between"
        >
          <p className="text-small uppercase tracking-wide text-on-dark-secondary">
            Need help with a specific order? Support can guide you directly.
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
