import React, { forwardRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { Spinner } from '../feedback/Spinner';
import { focusRing } from '../../../styles/tokens/interactive';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'outlineDark' | 'danger';

// Solid-fill variants get a diagonal light-catching sweep on hover (same
// pattern as SpotlightCards' hover shimmer) instead of a flat color swap.
// Border/text-only variants (ghost, outline, outlineDark, danger) rely on
// their existing border/color fade — a sweep would have nothing to sweep
// over and would just look noisy on a transparent surface.
const SWEEP_VARIANTS: ReadonlySet<ButtonVariant> = new Set(['primary', 'secondary']);

// hover:scale applies to both <button> (Button) and <a>/<Link> (LinkButton,
// which has no disabled state); disabled:hover:scale-100 cancels it for real
// disabled buttons and is a no-op on anchors since :disabled never matches them.
// Timing/easing mirror motionTiers.normal (duration.base = 350ms) and
// easing.cinematic from styles/tokens/motion.ts, so button interactions read
// as part of the same motion language as Modal/Toast/Hero rather than an
// independent, faster CSS-only value.
// gap-3 has no visible effect on <Button>/<LinkButton> (ButtonContent's own
// z-10 span is the only in-flow flex child once the sweep overlay is taken
// out of flow via `absolute`), but is load-bearing for the buttonClasses()
// escape hatch, whose callers render icon+text children directly with no
// wrapper span.
const baseClasses =
  'group relative inline-flex items-center justify-center gap-3 text-caption font-bold uppercase tracking-wider transition-[color,background-color,border-color,box-shadow,transform,letter-spacing] duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:hover:scale-[1.02] motion-safe:hover:tracking-[0.12em] motion-safe:active:scale-95 disabled:hover:scale-100 motion-reduce:transform-none motion-reduce:transition-none disabled:cursor-not-allowed';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'wide' | 'icon';

// 'md' intentionally has no entry: it falls back to each variant's own
// built-in padding/type scale (variantClasses below), so existing call
// sites stay pixel-identical unless they explicitly opt into sm/lg.
const sizeClasses: Partial<Record<ButtonSize, string>> = {
  sm: 'px-4 py-2 text-micro tracking-wide',
  lg: 'px-10 py-4 text-small tracking-wider',
  wide: 'px-8 py-4 tracking-wider',
  // Fixed 40px square for icon-only controls (cart close, Hero transport,
  // product-card quick-add) — overrides variantClasses' own padding since it
  // comes later in the cn() merge order below.
  icon: 'h-10 w-10 p-0 shrink-0',
};

const variantClasses: Record<ButtonVariant, string> = {
  // Dark-on-light "primary" pattern (ProductCard quickAdd / CartDrawer checkout).
  primary:
    'overflow-hidden bg-brand-black text-brand-white px-8 py-4 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500',
  // Transparent-at-rest, ivory-hairline CTA used on dark hero/nav surfaces —
  // deliberately NEVER a translucent fill: earlier this used a 20%-alpha gold
  // wash (bg-accent-gold-muted) sitting directly on Hero's photographic
  // backgrounds, so its rendered color depended on whatever photo showed
  // through underneath (champagne-on-champagne on a golden slide, washed-out
  // on a bright one, muddy olive on a dark one) instead of being one fixed,
  // predictable color. Rest/hover here always target opposite ends of the
  // ivory/near-black scale so text and fill can never converge to the same color.
  secondary:
    'overflow-hidden border border-brand-ivory/60 bg-transparent px-6 py-3 text-brand-ivory hover:border-brand-ivory hover:bg-brand-ivory hover:text-brand-black md:px-8 md:py-4 disabled:opacity-50',
  // Icon-only / low-emphasis buttons (Footer socials, Hero transport controls).
  ghost: 'text-on-dark-muted hover:text-brand-white px-2 py-2 disabled:opacity-50',
  // Light bordered button that inverts on hover (ProductCard "View Perfume").
  outline:
    'border border-on-light-muted px-4 py-3 text-brand-black hover:border-on-light-strong hover:bg-surface-overlay-subtle disabled:opacity-50',
  // Dark-surface counterpart of `outline` (Hero secondary CTA). No hover fill
  // by design — border/text shift to gold instead, kept visually distinct
  // from `secondary`'s ivory fill-on-hover.
  outlineDark:
    'border border-on-dark-muted bg-transparent px-6 py-3 text-brand-white hover:border-brand-gold hover:text-brand-gold md:px-8 md:py-4 disabled:opacity-50',
  danger: 'border border-red-200 text-red-600 px-4 py-3 hover:bg-red-50 disabled:opacity-50',
};

/**
 * Shared class builder for cases that can't render <Button>/<LinkButton>
 * directly (e.g. native <a href> for external links). Keeps variant styling
 * in one place instead of duplicating baseClasses/variantClasses per call site.
 * Note: callers using this helper render their own children directly, so they
 * get the color/border/scale/tracking treatment but not the hover sweep below
 * (that requires the overlay markup ButtonContent renders internally).
 */
export const buttonClasses = (
  variant: ButtonVariant = 'primary',
  className?: string,
  size: ButtonSize = 'md',
) => cn(baseClasses, focusRing, variantClasses[variant], sizeClasses[size], className);

interface ButtonContentProps {
  variant: ButtonVariant;
  loading?: boolean;
  children: React.ReactNode;
}

// Renders the hover-sweep overlay (sweep-eligible variants only) plus the
// real content, wrapped in `relative z-10` so the sweep never paints over
// text/icons/spinner regardless of paint-order.
const ButtonContent = ({ variant, loading, children }: ButtonContentProps) => (
  <>
    {SWEEP_VARIANTS.has(variant) ? (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[55%] -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-[280%] motion-reduce:hidden"
      />
    ) : null}
    <span className="relative z-10 inline-flex items-center gap-3">
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </span>
  </>
);

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export type ButtonProps = ButtonOwnProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, disabled, className, children, ...rest },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={rest.type ?? 'button'}
        disabled={disabled || loading}
        className={cn(
          baseClasses,
          focusRing,
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...rest}
      >
        <ButtonContent loading={loading} variant={variant}>
          {children}
        </ButtonContent>
      </button>
    );
  },
);
Button.displayName = 'Button';

export interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...rest }, ref) => {
    return (
      <Link
        ref={ref}
        className={cn(
          baseClasses,
          focusRing,
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...rest}
      >
        <ButtonContent variant={variant}>{children}</ButtonContent>
      </Link>
    );
  },
);
LinkButton.displayName = 'LinkButton';
