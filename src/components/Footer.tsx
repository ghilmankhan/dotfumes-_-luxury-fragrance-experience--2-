import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';
import { Button } from './ui/primitives/Button';
import { Grid } from './ui/layout/Grid';
import { tracking } from '../styles/tokens/typography';
import { focusRing } from '../styles/tokens/interactive';
import { cn } from '../lib/utils';

const socialNotice = () =>
  useToastStore.getState().pushToast('Social channels are opening soon.', 'neutral');

export const Footer = () => {
  return (
    <footer className="bg-brand-black text-brand-white pt-24 pb-12 px-8 md:px-16 border-t border-on-dark-subtle">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-16 mb-24">
        {/* Brand Info */}
        <div className="max-w-xs">
          <h2 className={cn('font-serif text-3xl uppercase mb-8', tracking.wider)}>Dotfumes</h2>
          <p className="text-brand-gray text-body leading-relaxed font-light">
            An artisanal archive of silence. Curated in Paris, captured in Grasse.
          </p>
        </div>

        {/* Links Grid */}
        <Grid cols={{ base: 2, md: 3 }} gap={12} className="md:gap-24">
          <FooterGroup
            title="Archives"
            links={[
              { label: 'The Collection', to: '/collection' },
              { label: 'Limited Editions', status: 'coming-soon' },
              { label: 'Discovery Set', status: 'coming-soon' },
              { label: 'Gift Cards', status: 'coming-soon' },
            ]}
          />
          <FooterGroup
            title="The House"
            links={[
              { label: 'Our Story', to: '/about' },
              { label: 'The Journal', to: '/journal' },
              { label: 'Sustainability', to: '/sustainability' },
              { label: 'Careers', to: '/careers' },
            ]}
          />
          <FooterGroup
            title="Assist"
            links={[
              { label: 'Shipping', to: '/shipping' },
              { label: 'Returns', to: '/returns' },
              { label: 'Contact', to: '/contact' },
              { label: 'FAQ', to: '/faq' },
            ]}
          />
        </Grid>
      </div>

      <div className="max-w-7xl mx-auto border-t border-on-dark-subtle py-8">
        <p className="text-center text-small text-on-dark-secondary">
          Manual payment verification with WhatsApp and email support. Delivery is coordinated after
          confirmation.
        </p>
      </div>

      <div className="max-w-7xl mx-auto pt-4 border-t border-on-dark-subtle flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex gap-8">
          <Button
            variant="ghost"
            onClick={socialNotice}
            className="flex h-11 w-11 items-center justify-center p-0 normal-case tracking-normal md:h-auto md:w-auto md:px-2 md:py-2"
            aria-label="Instagram (opening soon)"
          >
            <Instagram size={18} strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            onClick={socialNotice}
            className="flex h-11 w-11 items-center justify-center p-0 normal-case tracking-normal md:h-auto md:w-auto md:px-2 md:py-2"
            aria-label="Twitter (opening soon)"
          >
            <Twitter size={18} strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            onClick={socialNotice}
            className="flex h-11 w-11 items-center justify-center p-0 normal-case tracking-normal md:h-auto md:w-auto md:px-2 md:py-2"
            aria-label="Facebook (opening soon)"
          >
            <Facebook size={18} strokeWidth={1.5} />
          </Button>
          <span
            className={cn('self-center text-caption uppercase text-on-dark-muted', tracking.normal)}
          >
            Opening soon
          </span>
        </div>

        <div className={cn('text-small uppercase text-on-dark-muted text-center', tracking.normal)}>
          © 2026 Dotfumes. All rights reserved. <br className="md:hidden" /> Designed for the
          refined palette.
        </div>

        <div className="flex gap-6">
          <Link
            to="/privacy"
            className={cn(
              'text-small uppercase tracking-normal text-on-dark-muted hover:text-brand-white transition-colors',
              focusRing,
            )}
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className={cn(
              'text-small uppercase tracking-normal text-on-dark-muted hover:text-brand-white transition-colors',
              focusRing,
            )}
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
};

type FooterLink = {
  label: string;
  to?: string;
  status?: 'coming-soon';
};

const FooterGroup = ({ title, links }: { title: string; links: FooterLink[] }) => (
  <div className="flex flex-col gap-6">
    <h4 className="text-brand-gold text-small uppercase tracking-wider font-bold">{title}</h4>
    <ul className="flex flex-col gap-4">
      {links.map((link) => (
        <li key={link.label}>
          {link.to ? (
            <Link
              to={link.to}
              className={cn(
                'text-on-dark-secondary text-small uppercase tracking-normal hover:text-brand-white transition-colors',
                focusRing,
              )}
            >
              {link.label}
            </Link>
          ) : (
            <span
              className="inline-flex max-w-full flex-col items-start gap-2 text-on-dark-muted text-small uppercase tracking-normal sm:flex-row sm:items-center"
              aria-label={`${link.label} opening soon`}
            >
              <span>{link.label}</span>
              {link.status === 'coming-soon' ? (
                <span className="border border-on-dark-subtle px-2 py-0.5 text-micro tracking-normal text-on-dark-muted">
                  Opening soon
                </span>
              ) : null}
            </span>
          )}
        </li>
      ))}
    </ul>
  </div>
);
