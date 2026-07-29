import { useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Card } from '../components/ui/primitives/Card';
import { Container } from '../components/ui/layout/Container';
import { Grid } from '../components/ui/layout/Grid';
import { appConfig } from '../lib/config';
import { focusRing } from '../styles/tokens/interactive';
import { cn } from '../lib/utils';

const formatWhatsAppNumber = (rawNumber: string) => {
  const normalized = rawNumber.replace(/[^\d]/g, '');
  return normalized ? `+${normalized}` : rawNumber;
};

export const ContactPage = () => {
  usePageMeta({
    title: 'Contact | DOTFUMES',
    description: 'Contact Dotfumes support for order help and delivery coordination.',
    path: '/contact',
  });

  const supportEmail = appConfig.clientOrderEmail;
  const hasWhatsAppSupport = appConfig.hasConfiguredWhatsAppNumber;
  const hasEmailSupport = appConfig.hasConfiguredOrderEmail;
  const whatsappDigits = appConfig.clientWhatsAppNumber.replace(/[^\d]/g, '');
  const whatsappNumber = useMemo(() => formatWhatsAppNumber(appConfig.clientWhatsAppNumber), []);

  return (
    <section className="min-h-screen bg-brand-black text-brand-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-small font-bold uppercase tracking-wider text-brand-gold">Assist</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-none tracking-tight md:text-8xl">
          Contact
        </h1>
        <p className="mt-8 max-w-3xl text-body leading-8 text-on-dark-secondary">
          For payment questions, order updates, and delivery coordination, reach Dotfumes support
          directly through WhatsApp or email.
        </p>

        <Grid cols={{ sm: 3 }} className="mt-12">
          <Card as="article" variant="dark">
            <p className="text-caption uppercase tracking-wide text-on-dark-secondary">Step 1</p>
            <p className="mt-3 text-body leading-7 text-on-dark-secondary">
              Share your name and order ID so support can identify your request quickly.
            </p>
          </Card>
          <Card as="article" variant="dark">
            <p className="text-caption uppercase tracking-wide text-on-dark-secondary">Step 2</p>
            <p className="mt-3 text-body leading-7 text-on-dark-secondary">
              Mention whether you need checkout help, payment proof guidance, or delivery updates.
            </p>
          </Card>
          <Card as="article" variant="dark">
            <p className="text-caption uppercase tracking-wide text-on-dark-secondary">Step 3</p>
            <p className="mt-3 text-body leading-7 text-on-dark-secondary">
              Support confirms next steps and coordinates your order after verification.
            </p>
          </Card>
        </Grid>

        <Grid cols={{ sm: 2 }} className="mt-10">
          {hasWhatsAppSupport && whatsappDigits ? (
            <Card
              as="a"
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noreferrer"
              variant="dark"
              className={cn(
                'border-on-dark-muted bg-surface-overlay-muted px-6 py-4 transition-colors hover:border-brand-gold hover:text-brand-gold',
                focusRing,
              )}
            >
              <p className="text-small uppercase tracking-wide text-on-dark-secondary">WhatsApp</p>
              <p className="mt-2 text-body">{whatsappNumber}</p>
              <p className="mt-3 text-small text-on-dark-muted">Fastest route for active orders</p>
            </Card>
          ) : (
            <Card
              variant="dark"
              padding="wide"
              className="border-on-dark-muted bg-surface-overlay-muted"
            >
              <p className="text-small uppercase tracking-wide text-on-dark-secondary">WhatsApp</p>
              <p className="mt-2 text-body text-on-dark-secondary">Shared after order request</p>
              <p className="mt-3 text-small text-on-dark-muted">Use email for immediate support</p>
            </Card>
          )}

          {hasEmailSupport ? (
            <Card
              as="a"
              href={`mailto:${supportEmail}`}
              variant="dark"
              className={cn(
                'border-on-dark-muted bg-surface-overlay-muted px-6 py-4 transition-colors hover:border-brand-gold hover:text-brand-gold',
                focusRing,
              )}
            >
              <p className="text-small uppercase tracking-wide text-on-dark-secondary">Email</p>
              <p className="mt-2 break-words text-body">{supportEmail}</p>
              <p className="mt-3 text-small text-on-dark-muted">Best for detailed requests</p>
            </Card>
          ) : (
            <Card
              variant="dark"
              padding="wide"
              className="border-on-dark-muted bg-surface-overlay-muted"
            >
              <p className="text-small uppercase tracking-wide text-on-dark-secondary">Email</p>
              <p className="mt-2 text-body text-on-dark-secondary">
                Support email shared on request
              </p>
              <p className="mt-3 text-small text-on-dark-muted">Contact through available channels</p>
            </Card>
          )}
        </Grid>

        <Card variant="dark" padding="comfortable" className="mt-12 bg-surface-overlay-muted">
          <p className="text-small text-on-dark-secondary">
            Manual payment verification is part of every order. Delivery coordination begins after
            confirmation.
          </p>
        </Card>
      </Container>
    </section>
  );
};
