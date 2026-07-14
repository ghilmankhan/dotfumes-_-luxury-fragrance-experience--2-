import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { Link, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useCartStore, selectCartCount } from '../store/useCartStore';
import { cn } from '../lib/utils';
import { Modal } from './ui/primitives/Modal';
import { Button } from './ui/primitives/Button';
import { easing, duration } from '../styles/tokens/motion';
import { tracking } from '../styles/tokens/typography';
import { touchTarget } from '../styles/tokens/interactive';

export const Navbar = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openCart = useCartStore((s) => s.openCart);
  const cartCount = useCartStore(selectCartCount);
  const isLightRoute = location.pathname === '/checkout' || location.pathname.startsWith('/product/');
  const useSolidNav = isScrolled || isLightRoute;
  const isLightNav = isLightRoute;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: duration.slow, ease: easing.cinematic }}
        className={cn(
          'fixed top-0 left-0 w-full z-[60] transition-all duration-500 px-6 py-5 md:px-16 md:py-10 flex items-center justify-between',
          useSolidNav
            ? isLightNav
              ? 'bg-brand-white/94 backdrop-blur-md py-4 md:py-6 shadow-sm border-b border-black/8'
              : 'bg-brand-black/90 backdrop-blur-md py-4 md:py-6 shadow-sm border-b border-white/5'
            : 'bg-transparent',
        )}
      >
        <div className="flex-1 hidden lg:flex items-center gap-12">
          <div
            className={cn(
              'text-[10px] uppercase',
              tracking.wider,
              isLightNav ? 'text-black/45' : 'text-white/40',
            )}
          >
            Paris / Grasse
          </div>
          <div className="flex items-center gap-8">
            <NavLink to="/collection" isLightNav={isLightNav}>
              Shop
            </NavLink>
            <NavLink to="/about" isLightNav={isLightNav}>
              The House
            </NavLink>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Link to="/" className="group" aria-label="Dotfumes home">
            <h1
              className={cn(
                'text-xl md:text-2xl font-serif tracking-[0.6em] uppercase font-light',
                isLightNav ? 'text-brand-black' : 'text-white',
              )}
            >
              Dotfumes
            </h1>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-end gap-5 md:gap-8">
          <Button
            variant="ghost"
            onClick={openCart}
            className={cn(
              'relative p-2 normal-case tracking-normal transition-colors duration-300',
              touchTarget,
              isLightNav ? 'text-black/70 hover:text-black' : 'text-white/60 hover:text-white',
            )}
            aria-label={`Open cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          >
            <div className="flex items-center gap-3">
              <span className={cn('text-[10px] uppercase hidden md:block', tracking.normal)}>
                Cart ({cartCount})
              </span>
              <ShoppingBag size={18} strokeWidth={1} />
            </div>
          </Button>
          <Button
            ref={triggerRef}
            variant="ghost"
            onClick={() => setIsMenuOpen(true)}
            className={cn(
              'lg:hidden p-2 normal-case tracking-normal transition-colors',
              touchTarget,
              isLightNav ? 'text-black/70 hover:text-black' : 'text-white/70 hover:text-white',
            )}
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
          >
            <Menu size={22} strokeWidth={1} />
          </Button>
        </div>
      </motion.nav>

      <Modal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        ariaLabel="Mobile navigation"
        id="mobile-navigation"
        triggerRef={triggerRef}
        transitionDuration={0.65}
        overlayClassName="z-[90] bg-black/60 lg:hidden"
        dialogClassName="z-[100] flex h-dvh w-full max-w-sm flex-col bg-brand-black px-8 py-7 text-white shadow-lg lg:hidden"
      >
        <div className="flex items-center justify-between">
          <span className="font-serif text-xl uppercase tracking-[0.5em]">Dotfumes</span>
          <Button
            variant="ghost"
            onClick={() => setIsMenuOpen(false)}
            className={cn(
              'p-2 normal-case tracking-normal text-white/60 hover:text-white',
              touchTarget,
            )}
            aria-label="Close navigation menu"
          >
            <X size={22} strokeWidth={1} />
          </Button>
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
          <Button
            variant="secondary"
            onClick={() => {
              setIsMenuOpen(false);
              openCart();
            }}
            className="mt-8 w-full tracking-[0.35em]"
          >
            <ShoppingBag size={15} strokeWidth={1.3} />
            Cart ({cartCount})
          </Button>
        </div>
      </Modal>
    </>
  );
};

const NavLink = ({
  to,
  children,
  isLightNav,
}: {
  to: string;
  children: React.ReactNode;
  isLightNav: boolean;
}) => {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'text-[10px] uppercase transition-colors duration-300',
          tracking.wide,
          isLightNav
            ? isActive
              ? 'text-black'
              : 'text-black/65 hover:text-black'
            : isActive
              ? 'text-white'
              : 'text-white/60 hover:text-white',
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
