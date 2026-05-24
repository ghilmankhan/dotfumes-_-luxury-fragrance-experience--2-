import { useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
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
  const whatsappNumber = useMemo(
    () => formatWhatsAppNumber(appConfig.clientWhatsAppNumber),
    [],
  );

  return (
    <section className="min-h-screen bg-brand-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-36 md:px-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.42em] text-brand-gold">Assist</p>
        <h1 className="mt-8 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
          Contact
        </h1>
        <p className="mt-8 max-w-3xl text-sm leading-8 text-white/78">
          For payment questions, order updates, and delivery coordination, reach Dotfumes support
          directly through WhatsApp or email.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <article className="border border-white/10 bg-white/[0.02] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Step 1</p>
            <p className="mt-3 text-sm leading-7 text-white/78">
              Share your name and order ID so support can identify your request quickly.
            </p>
          </article>
          <article className="border border-white/10 bg-white/[0.02] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Step 2</p>
            <p className="mt-3 text-sm leading-7 text-white/78">
              Mention whether you need checkout help, payment proof guidance, or delivery updates.
            </p>
          </article>
          <article className="border border-white/10 bg-white/[0.02] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/65">Step 3</p>
            <p className="mt-3 text-sm leading-7 text-white/78">
              Support confirms next steps and coordinates your order after verification.
            </p>
          </article>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <a
            href={`https://wa.me/${appConfig.clientWhatsAppNumber.replace(/[^\d]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="border border-white/20 bg-black/30 px-6 py-5 transition-colors hover:border-brand-gold hover:text-brand-gold"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/65">WhatsApp</p>
            <p className="mt-2 text-sm">{whatsappNumber}</p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/45">
              Fastest route for active orders
            </p>
          </a>

          <a
            href={`mailto:${supportEmail}`}
            className="border border-white/20 bg-black/30 px-6 py-5 transition-colors hover:border-brand-gold hover:text-brand-gold"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/65">Email</p>
            <p className="mt-2 text-sm">{supportEmail}</p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/45">
              Best for detailed requests
            </p>
          </a>
        </div>

        <div className="mt-12 border border-white/10 bg-black/35 px-6 py-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/72">
            Manual payment verification is part of every order. Delivery coordination begins after
            confirmation.
          </p>
        </div>
      </div>
    </section>
  );
};
