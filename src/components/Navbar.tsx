import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { cn } from '../lib/utils';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { toggleCart, items } = useCartStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed top-0 left-0 w-full z-[60] transition-all duration-500 px-8 py-6 md:px-16 md:py-10 flex items-center justify-between",
        isScrolled ? "bg-brand-black/90 backdrop-blur-md py-4 md:py-6 shadow-sm border-b border-white/5" : "bg-transparent"
      )}
    >
      <div className="flex-1 hidden lg:flex items-center gap-12">
        <div className="text-[10px] tracking-[0.4em] uppercase text-white/40">
          Paris / Grasse
        </div>
        <div className="flex items-center gap-8">
          <NavLink href="/shop">Collections</NavLink>
          <NavLink href="/about">Journal</NavLink>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <a href="/" className="group">
          <h1 className="text-xl md:text-2xl font-serif tracking-[0.6em] uppercase text-white font-light">
            Dotfumes
          </h1>
        </a>
      </div>

      <div className="flex-1 flex items-center justify-end gap-8">
        <button 
          onClick={toggleCart}
          className="relative p-2 text-white/60 hover:text-white transition-colors duration-300"
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-[0.2em] uppercase hidden md:block">Cart ({cartCount})</span>
            <ShoppingBag size={18} strokeWidth={1} />
          </div>
        </button>
        <button className="md:hidden text-white/60">
          <Menu size={22} strokeWidth={1} />
        </button>
      </div>
    </motion.nav>
  );
};

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  return (
    <a 
      href={href} 
      className="text-white/60 text-[10px] uppercase tracking-[0.3em] hover:text-white transition-colors duration-300"
    >
      {children}
    </a>
  );
};
