import React from 'react';
import { motion } from 'motion/react';
import { Instagram, Twitter, Facebook } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-brand-black text-white pt-24 pb-12 px-8 md:px-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-16 mb-24">
        {/* Brand Info */}
        <div className="max-w-xs">
          <h2 className="font-serif text-3xl tracking-[0.4em] uppercase mb-8">Dotfumes</h2>
          <p className="text-brand-gray text-xs leading-relaxed uppercase tracking-widest font-light">
            An artisanal archive of silence. Curated in Paris, captured in Grasse.
          </p>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-24">
          <FooterGroup 
            title="Archives" 
            links={["The Collection", "Limited Editions", "Discovery Set", "Gift Cards"]} 
          />
          <FooterGroup 
            title="The House" 
            links={["Our Story", "The Journal", "Sustainability", "Careers"]} 
          />
          <FooterGroup 
            title="Assist" 
            links={["Shipping", "Returns", "Contact", "FAQ"]} 
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex gap-8">
          <a href="#" className="text-white/40 hover:text-white transition-colors"><Instagram size={18} strokeWidth={1.5} /></a>
          <a href="#" className="text-white/40 hover:text-white transition-colors"><Twitter size={18} strokeWidth={1.5} /></a>
          <a href="#" className="text-white/40 hover:text-white transition-colors"><Facebook size={18} strokeWidth={1.5} /></a>
        </div>

        <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 text-center">
          © 2026 Dotfumes. All rights reserved. <br className="md:hidden" /> Designed for the refined palette.
        </div>

        <div className="flex gap-6">
          <span className="text-[10px] uppercase tracking-[0.1em] text-white/40">Privacy</span>
          <span className="text-[10px] uppercase tracking-[0.1em] text-white/40">Terms</span>
        </div>
      </div>
    </footer>
  );
};

const FooterGroup = ({ title, links }: { title: string; links: string[] }) => (
  <div className="flex flex-col gap-6">
    <h4 className="text-brand-gold text-[10px] uppercase tracking-[0.4em] font-bold">{title}</h4>
    <ul className="flex flex-col gap-4">
      {links.map(link => (
        <li key={link}>
          <a href="#" className="text-white/40 text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors">
            {link}
          </a>
        </li>
      ))}
    </ul>
  </div>
);
