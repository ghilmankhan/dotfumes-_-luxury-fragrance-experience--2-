import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { Link, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useCartStore, selectCartCount } from '../store/useCartStore';
import { cn } from '../lib/utils';
import { Modal } from './ui/primitives/Modal';
import { Button } from './ui/primitives/Button';
import { easing, duration } from '../styles/tokens/motion';
import { tracking } from '../styles/tokens/typography';
import { focusRing, touchTarget } from '../styles/tokens/interactive';
import { runScalePulse } from '../lib/luxuryMotion';

const mobileMenuTransitionDuration = 0.65;
const openCart = () => useCartStore.getState().openCart();

export const Navbar = () => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(
    () => typeof window !== 'undefined' && window.scrollY > 50,
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cartOpenTimeoutRef = useRef<number | null>(null);
  const isScrolledRef = useRef(isScrolled);
  const cartCount = useCartStore(selectCartCount);
  const cartBadgeRef = useRef<HTMLSpanElement>(null);
  const prevCartCountRef = useRef(cartCount);

  // Quiet, single acknowledgement pulse on the badge when the count actually
  // changes — never on mount, never looping.
  useEffect(() => {
    if (cartCount !== prevCartCountRef.current) {
      runScalePulse(cartBadgeRef.current, Boolean(shouldReduceMotion));
      prevCartCountRef.current = cartCount;
    }
  }, [cartCount, shouldReduceMotion]);
  const isLightRoute =
    location.pathname === '/checkout' || location.pathname.startsWith('/product/');
  const useSolidNav = isScrolled || isLightRoute;
  const isLightNav = isLightRoute;

  useEffect(() => {
    const handleScroll = () => {
      const nextIsScrolled = window.scrollY > 50;
      if (isScrolledRef.current === nextIsScrolled) {
        return;
      }

      isScrolledRef.current = nextIsScrolled;
      setIsScrolled(nextIsScrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(
    () => () => {
      if (cartOpenTimeoutRef.current !== null) {
        window.clearTimeout(cartOpenTimeoutRef.current);
      }
    },
    [],
  );

  const closeMobileMenu = useCallback(() => {
    setIsMenuOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const dismissMobileMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  useEffect(() => {
    const desktopNavigation = window.matchMedia('(min-width: 1024px)');
    const closeAtDesktopBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) {
        dismissMobileMenu();
      }
    };

    desktopNavigation.addEventListener('change', closeAtDesktopBreakpoint);
    return () => desktopNavigation.removeEventListener('change', closeAtDesktopBreakpoint);
  }, [dismissMobileMenu]);

  const openMobileMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const handleMobileCartOpen = useCallback(() => {
    setIsMenuOpen(false);

    if (cartOpenTimeoutRef.current !== null) {
      window.clearTimeout(cartOpenTimeoutRef.current);
    }

    cartOpenTimeoutRef.current = window.setTimeout(
      () => {
        openCart();
        cartOpenTimeoutRef.current = null;
      },
      shouldReduceMotion ? 0 : mobileMenuTransitionDuration * 1000,
    );
  }, [shouldReduceMotion]);

  return (
    <>
      <motion.nav
        aria-label="Primary navigation"
        initial={shouldReduceMotion ? false : { y: -100 }}
        animate={{ y: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : duration.slow,
          ease: easing.cinematic,
        }}
        className={cn(
          'fixed left-0 top-0 z-60 flex h-20 w-full items-center justify-between px-4 transition-colors transition-shadow duration-500 motion-reduce:transform-none motion-reduce:transition-none sm:px-6 md:h-28 md:px-16',
          useSolidNav
            ? isLightNav
              ? 'border-b border-on-light-subtle bg-surface-light-raised shadow-sm backdrop-blur-md'
              : 'border-b border-on-dark-subtle bg-surface-overlay-solid shadow-sm backdrop-blur-md'
            : 'bg-transparent',
        )}
      >
        <div className="flex-1 hidden lg:flex items-center gap-12">
          <div
            className={cn(
              'text-caption uppercase',
              tracking.wider,
              isLightNav ? 'text-on-light-muted' : 'text-on-dark-muted',
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

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
          <Link
            to="/"
            className={cn('group pointer-events-auto', focusRing)}
            aria-label="Dotfumes home"
          >
            <span
              aria-hidden="true"
              className={cn(
                'font-serif text-xl font-light uppercase sm:hidden',
                isLightNav ? 'text-brand-black' : 'text-brand-white',
              )}
            >
              D
            </span>
            <span
              className={cn(
                'hidden font-serif text-xl font-light uppercase tracking-widest sm:inline md:text-2xl',
                isLightNav ? 'text-brand-black' : 'text-brand-white',
              )}
            >
              Dotfumes
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-between gap-6 md:gap-8 lg:justify-end">
          <Button
            variant="ghost"
            onClick={openCart}
            className={cn(
              'relative p-2 normal-case tracking-normal transition-colors duration-300 motion-reduce:active:scale-100 motion-reduce:transition-none',
              focusRing,
              touchTarget,
              isLightNav
                ? 'text-on-light-secondary hover:text-brand-black'
                : 'text-on-dark-secondary hover:text-brand-white',
            )}
            aria-label={`Open cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          >
            <div className="flex items-center gap-3">
              <span className={cn('text-caption uppercase hidden md:block', tracking.normal)}>
                Cart ({cartCount})
              </span>
              <ShoppingBag aria-hidden="true" size={18} strokeWidth={1} />
              <span
                ref={cartBadgeRef}
                aria-hidden="true"
                className="absolute right-0 top-0 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-brand-gold px-1 text-micro font-bold leading-none text-brand-black md:hidden"
              >
                {cartCount}
              </span>
            </div>
          </Button>
          <Button
            ref={triggerRef}
            variant="ghost"
            onClick={openMobileMenu}
            className={cn(
              'p-2 normal-case tracking-normal transition-colors motion-reduce:active:scale-100 motion-reduce:transition-none lg:hidden',
              focusRing,
              touchTarget,
              isLightNav
                ? 'text-on-light-secondary hover:text-brand-black'
                : 'text-on-dark-secondary hover:text-brand-white',
            )}
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
          >
            <Menu aria-hidden="true" size={22} strokeWidth={1} />
          </Button>
        </div>
      </motion.nav>

      <Modal
        isOpen={isMenuOpen}
        onClose={closeMobileMenu}
        ariaLabel="Mobile navigation"
        id="mobile-navigation"
        triggerRef={triggerRef}
        transitionDuration={shouldReduceMotion ? 0 : mobileMenuTransitionDuration}
        overlayClassName="z-90 bg-surface-overlay-strong motion-reduce:!opacity-100 motion-reduce:backdrop-blur-none motion-reduce:transition-none lg:hidden"
        dialogClassName="z-100 flex h-dvh w-full max-w-sm flex-col overflow-y-auto overscroll-contain bg-brand-black px-8 text-brand-white shadow-lg motion-reduce:!transform-none motion-reduce:transition-none lg:hidden"
      >
        <div
          className="flex items-center justify-between"
          style={{
            paddingTop: 'max(2rem, var(--safe-top))',
          }}
        >
          <Link
            to="/"
            onClick={dismissMobileMenu}
            className={cn(
              'font-serif text-xl uppercase tracking-widest motion-reduce:transition-none',
              focusRing,
              'focus-visible:ring-offset-brand-black',
            )}
            aria-label="Dotfumes home"
          >
            Dotfumes
          </Link>
          <Button
            variant="ghost"
            onClick={closeMobileMenu}
            className={cn(
              'p-2 normal-case tracking-normal text-on-dark-secondary hover:text-brand-white motion-reduce:active:scale-100 motion-reduce:transition-none',
              focusRing,
              'focus-visible:ring-offset-brand-black',
              touchTarget,
            )}
            aria-label="Close navigation menu"
          >
            <X aria-hidden="true" size={22} strokeWidth={1} />
          </Button>
        </div>

        <nav className="mt-20 flex flex-col gap-8" aria-label="Mobile navigation">
          <MobileNavLink to="/" label="Home" onNavigate={dismissMobileMenu} />
          <MobileNavLink to="/collection" label="Shop" onNavigate={dismissMobileMenu} />
          <MobileNavLink to="/about" label="The House" onNavigate={dismissMobileMenu} />
          <MobileNavLink to="/checkout" label="Checkout" onNavigate={dismissMobileMenu} />
        </nav>

        <div
          className="mt-auto border-t border-on-dark-subtle pt-8"
          style={{
            paddingBottom: 'max(2rem, var(--safe-bottom))',
          }}
        >
          <p className="text-caption uppercase leading-6 tracking-wider text-on-dark-faint">
            Paris / Grasse
            <br />
            Private fragrance archives
          </p>
          <Button
            variant="secondary"
            onClick={handleMobileCartOpen}
            className={cn(
              'mt-8 w-full tracking-wider motion-reduce:active:scale-100 motion-reduce:transition-none',
              focusRing,
              'focus-visible:ring-offset-brand-black',
            )}
          >
            <ShoppingBag aria-hidden="true" size={15} strokeWidth={1.3} />
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
          'text-caption uppercase transition-colors duration-300 motion-reduce:transition-none',
          focusRing,
          tracking.wide,
          isLightNav
            ? isActive
              ? 'text-brand-black'
              : 'text-on-light-secondary hover:text-brand-black'
            : isActive
              ? 'text-brand-white'
              : 'text-on-dark-secondary hover:text-brand-white',
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
        'border-b border-on-dark-subtle pb-4 font-serif text-4xl italic transition-colors motion-reduce:transition-none',
        focusRing,
        'focus-visible:ring-offset-brand-black',
        isActive ? 'text-brand-gold' : 'text-brand-white hover:text-brand-gold',
      )
    }
  >
    {label}
  </RouterNavLink>
);
