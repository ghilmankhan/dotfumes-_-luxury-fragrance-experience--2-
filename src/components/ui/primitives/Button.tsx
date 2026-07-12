import React, { forwardRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { Spinner } from '../feedback/Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';

const focusRing =
  'focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-gold';

const baseClasses =
  'inline-flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.32em] transition-all active:scale-95 disabled:cursor-not-allowed';

export type ButtonSize = 'sm' | 'md' | 'lg';

// 'md' intentionally has no entry: it falls back to each variant's own
// built-in padding/type scale (variantClasses below), so existing call
// sites stay pixel-identical unless they explicitly opt into sm/lg.
const sizeClasses: Partial<Record<ButtonSize, string>> = {
  sm: 'px-4 py-2 text-[9px] tracking-[0.28em]',
  lg: 'px-10 py-5 text-[11px] tracking-[0.36em]',
};

const variantClasses: Record<ButtonVariant, string> = {
  // Dark-on-light "primary" pattern (ProductCard quickAdd / CartDrawer checkout).
  primary:
    'bg-brand-black text-white px-8 py-4 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500',
  // Gold-accented pattern used on dark hero/nav surfaces.
  secondary:
    'border border-brand-gold/45 bg-brand-gold/18 px-6 py-3 text-white hover:border-brand-gold hover:bg-brand-gold hover:text-black md:px-8 md:py-4 disabled:opacity-50',
  // Icon-only / low-emphasis buttons (Footer socials).
  ghost: 'text-white/40 hover:text-white px-2 py-2 disabled:opacity-50',
  // Light bordered button that inverts on hover (Hero secondary CTA, ProductCard "View Perfume").
  outline:
    'border border-black/10 px-4 py-3 text-brand-black hover:border-black/30 hover:bg-black/5 disabled:opacity-50',
  danger:
    'border border-red-200 text-red-600 px-4 py-3 hover:bg-red-50 disabled:opacity-50',
};

/**
 * Shared class builder for cases that can't render <Button>/<LinkButton>
 * directly (e.g. native <a href> for external links). Keeps variant styling
 * in one place instead of duplicating baseClasses/variantClasses per call site.
 */
export const buttonClasses = (
  variant: ButtonVariant = 'primary',
  className?: string,
  size: ButtonSize = 'md',
) => cn(baseClasses, focusRing, variantClasses[variant], sizeClasses[size], className);

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export type ButtonProps = ButtonOwnProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={rest.type ?? 'button'}
        disabled={disabled || loading}
        className={cn(baseClasses, focusRing, variantClasses[variant], sizeClasses[size], className)}
        {...rest}
      >
        {loading ? <Spinner size="sm" /> : null}
        {children}
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
        className={cn(baseClasses, focusRing, variantClasses[variant], sizeClasses[size], className)}
        {...rest}
      >
        {children}
      </Link>
    );
  },
);
LinkButton.displayName = 'LinkButton';
