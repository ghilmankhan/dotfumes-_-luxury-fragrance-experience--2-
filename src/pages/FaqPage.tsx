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
    <section className="min-h-screen bg-brand-black text-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">Assist</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          Quick answers about payment proof, manual verification, and order coordination.
        </p>

        <div className="mt-12 space-y-6">
          {faqs.map((faq) => (
            <Card as="article" key={faq.question} variant="dark" className="p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
                {faq.question}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/75">{faq.answer}</p>
            </Card>
          ))}
        </div>

        <Card variant="dark" className="mt-12 bg-black/35 px-6 py-6 sm:flex sm:items-center sm:justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">
            Need help with a specific order? Support can guide you directly.
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
