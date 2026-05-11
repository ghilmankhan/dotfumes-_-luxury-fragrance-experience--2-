import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { Link, NavLink as RouterNavLink } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { cn } from '../lib/utils';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { openCart, items } = useCartStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(
      drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'fixed top-0 left-0 w-full z-[60] transition-all duration-500 px-6 py-5 md:px-16 md:py-10 flex items-center justify-between',
          isScrolled
            ? 'bg-brand-black/90 backdrop-blur-md py-4 md:py-6 shadow-sm border-b border-white/5'
            : 'bg-transparent',
        )}
      >
        <div className="flex-1 hidden lg:flex items-center gap-12">
          <div className="text-[10px] tracking-[0.4em] uppercase text-white/40">Paris / Grasse</div>
          <div className="flex items-center gap-8">
            <NavLink to="/collection">Collections</NavLink>
            <NavLink to="/about">The House</NavLink>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Link to="/" className="group" aria-label="Dotfumes home">
            <h1 className="text-xl md:text-2xl font-serif tracking-[0.6em] uppercase text-white font-light">
              Dotfumes
            </h1>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-end gap-5 md:gap-8">
          <button
            type="button"
            onClick={openCart}
            className="relative p-2 text-white/60 hover:text-white transition-colors duration-300 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
            aria-label={`Open cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] tracking-[0.2em] uppercase hidden md:block">
                Cart ({cartCount})
              </span>
              <ShoppingBag size={18} strokeWidth={1} />
            </div>
          </button>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="lg:hidden text-white/70 p-2 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
          >
            <Menu size={22} strokeWidth={1} />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
            <motion.div
              id="mobile-navigation"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-0 top-0 z-[100] flex h-dvh w-full max-w-sm flex-col bg-brand-black px-8 py-7 text-white shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-xl uppercase tracking-[0.5em]">Dotfumes</span>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-white/60 transition-colors hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold"
                  aria-label="Close navigation menu"
                >
                  <X size={22} strokeWidth={1} />
                </button>
              </div>

              <div className="mt-20 flex flex-col gap-7">
                <MobileNavLink to="/" label="Home" onNavigate={() => setIsMenuOpen(false)} />
                <MobileNavLink
                  to="/collection"
                  label="Collection"
                  onNavigate={() => setIsMenuOpen(false)}
                />
                <MobileNavLink
                  to="/about"
                  label="The House"
                  onNavigate={() => setIsMenuOpen(false)}
                />
                <MobileNavLink
                  to="/checkout"
                  label="Checkout"
                  onNavigate={() => setIsMenuOpen(false)}
                />
              </div>

              <div className="mt-auto border-t border-white/10 pt-8">
                <p className="text-[10px] uppercase leading-6 tracking-[0.35em] text-white/35">
                  Paris / Grasse
                  <br />
                  Private fragrance archives
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    openCart();
                  }}
                  className="mt-8 flex w-full items-center justify-center gap-3 border border-brand-gold/35 px-6 py-4 text-[10px] uppercase tracking-[0.35em] text-white transition-colors hover:bg-brand-gold hover:text-black"
                >
                  <ShoppingBag size={15} strokeWidth={1.3} />
                  Cart ({cartCount})
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'text-[10px] uppercase tracking-[0.3em] transition-colors duration-300',
          isActive ? 'text-white' : 'text-white/60 hover:text-white',
        )
      }
    >
      {children}
    </RouterNavLink>
  );
};

const MobileNavLink = ({
  to,
  label,
  onNavigate,
}: {
  to: string;
  label: string;
  onNavigate: () => void;
}) => (
  <RouterNavLink
    to={to}
    onClick={onNavigate}
    className={({ isActive }) =>
      cn(
        'border-b border-white/10 pb-5 font-serif text-4xl italic transition-colors',
        isActive ? 'text-brand-gold' : 'text-white hover:text-brand-gold',
      )
    }
  >
    {label}
  </RouterNavLink>
);
