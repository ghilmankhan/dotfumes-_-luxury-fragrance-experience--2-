import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';

export const Footer = () => {
  const { pushToast } = useToastStore();
  const socialNotice = () => pushToast('Social channels are opening soon.', 'neutral');

  return (
    <footer className="bg-brand-black text-white pt-24 pb-12 px-8 md:px-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-16 mb-24">
        {/* Brand Info */}
        <div className="max-w-xs">
          <h2 className="font-serif text-3xl tracking-[0.4em] uppercase mb-8">Dotfumes</h2>
          <p className="text-brand-gray text-sm leading-relaxed uppercase tracking-[0.22em] font-light">
            An artisanal archive of silence. Curated in Paris, captured in Grasse.
          </p>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-24">
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-white/5 py-8">
        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-white/55">
          Manual payment verification with WhatsApp and email support. Delivery is coordinated after
          confirmation.
        </p>
      </div>

      <div className="max-w-7xl mx-auto pt-4 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex gap-8">
          <button
            type="button"
            onClick={socialNotice}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Instagram (opening soon)"
          >
            <Instagram size={18} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={socialNotice}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Twitter (opening soon)"
          >
            <Twitter size={18} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={socialNotice}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Facebook (opening soon)"
          >
            <Facebook size={18} strokeWidth={1.5} />
          </button>
          <span className="self-center text-[10px] uppercase tracking-[0.2em] text-white/45">
            Opening soon
          </span>
        </div>

        <div className="text-[11px] uppercase tracking-[0.2em] text-white/45 text-center">
          © 2026 Dotfumes. All rights reserved. <br className="md:hidden" /> Designed for the
          refined palette.
        </div>

        <div className="flex gap-6">
          <Link
            to="/privacy"
            className="text-[11px] uppercase tracking-[0.14em] text-white/55 hover:text-white transition-colors"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="text-[11px] uppercase tracking-[0.14em] text-white/55 hover:text-white transition-colors"
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
    <h4 className="text-brand-gold text-[11px] uppercase tracking-[0.34em] font-bold">{title}</h4>
    <ul className="flex flex-col gap-4">
      {links.map((link) => (
        <li key={link.label}>
          {link.to ? (
            <Link
              to={link.to}
              className="text-white/60 text-[11px] uppercase tracking-[0.16em] hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ) : (
            <span
              className="inline-flex items-center gap-2 text-white/45 text-[11px] uppercase tracking-[0.16em]"
              aria-label={`${link.label} opening soon`}
            >
              <span>{link.label}</span>
              {link.status === 'coming-soon' ? (
                <span className="border border-white/15 px-2 py-0.5 text-[9px] tracking-[0.16em] text-white/45">
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
