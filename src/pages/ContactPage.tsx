import { useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { Card } from '../components/ui/primitives/Card';
import { Container } from '../components/ui/layout/Container';
import { Grid } from '../components/ui/layout/Grid';
import { appConfig } from '../lib/config';

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
  const whatsappNumber = useMemo(
    () => formatWhatsAppNumber(appConfig.clientWhatsAppNumber),
    [],
  );

  return (
    <section className="min-h-screen bg-brand-black text-white">
      <Container size="lg" className="pb-24 pt-36">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">Assist</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Contact
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          For payment questions, order updates, and delivery coordination, reach Dotfumes support
          directly through WhatsApp or email.
        </p>

        <Grid cols={{ sm: 3 }} className="mt-12">
          <Card as="article" variant="dark" className="p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Step 1</p>
            <p className="mt-3 text-sm leading-7 text-white/78">
              Share your name and order ID so support can identify your request quickly.
            </p>
          </Card>
          <Card as="article" variant="dark" className="p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Step 2</p>
            <p className="mt-3 text-sm leading-7 text-white/78">
              Mention whether you need checkout help, payment proof guidance, or delivery updates.
            </p>
          </Card>
          <Card as="article" variant="dark" className="p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Step 3</p>
            <p className="mt-3 text-sm leading-7 text-white/78">
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
              className="border-white/20 bg-black/30 px-6 py-5 transition-colors hover:border-brand-gold hover:text-brand-gold"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/65">WhatsApp</p>
              <p className="mt-2 text-sm">{whatsappNumber}</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/45">
                Fastest route for active orders
              </p>
            </Card>
          ) : (
            <Card variant="dark" className="border-white/20 bg-black/30 px-6 py-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/65">WhatsApp</p>
              <p className="mt-2 text-sm text-white/80">Shared after order request</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/45">
                Use email for immediate support
              </p>
            </Card>
          )}

          {hasEmailSupport ? (
            <Card
              as="a"
              href={`mailto:${supportEmail}`}
              variant="dark"
              className="border-white/20 bg-black/30 px-6 py-5 transition-colors hover:border-brand-gold hover:text-brand-gold"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/65">Email</p>
              <p className="mt-2 text-sm">{supportEmail}</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/45">
                Best for detailed requests
              </p>
            </Card>
          ) : (
            <Card variant="dark" className="border-white/20 bg-black/30 px-6 py-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/65">Email</p>
              <p className="mt-2 text-sm text-white/80">Support email shared on request</p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/45">
                Contact through available channels
              </p>
            </Card>
          )}
        </Grid>

        <Card variant="dark" className="mt-12 bg-black/35 px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">
            Manual payment verification is part of every order. Delivery coordination begins after
            confirmation.
          </p>
        </Card>
      </Container>
    </section>
  );
};
