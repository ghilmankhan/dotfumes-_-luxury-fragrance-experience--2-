import React, { forwardRef } from 'react';
import { cn } from '../../../lib/utils';

export type InputVariant = 'light' | 'dark';

// light: CheckoutPage TextField pattern. dark: AdminPage password-gate pattern.
const variantClasses: Record<InputVariant, string> = {
  light: 'bg-white text-brand-black placeholder:text-black/30 border-black/10',
  dark: 'bg-black/30 text-white placeholder:text-white/30 border-white/20',
};

const errorClasses: Record<InputVariant, string> = {
  light: 'border-red-300',
  dark: 'border-red-400/60',
};

interface InputOwnProps {
  variant?: InputVariant;
  error?: boolean;
}

export type InputProps = InputOwnProps & React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'light', error = false, className, ...rest }, ref) => (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={cn(
        'w-full border px-4 py-3 text-sm outline-none transition-colors focus:border-brand-gold',
        error ? errorClasses[variant] : variantClasses[variant],
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';
