import React, { forwardRef } from 'react';
import { cn } from '../../../lib/utils';
import { focusRing } from '../../../styles/tokens/interactive';

export type InputVariant = 'light' | 'dark';

// light: CheckoutPage TextField pattern. dark: AdminPage password-gate pattern.
const variantClasses: Record<InputVariant, string> = {
  light: 'bg-brand-white text-brand-black placeholder:text-on-light-faint border-on-light-muted',
  dark: 'bg-surface-overlay-muted text-brand-white placeholder:text-on-dark-faint border-on-dark-muted',
};

const errorClasses: Record<InputVariant, string> = {
  light: 'border-red-300',
  dark: 'border-status-error',
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
        'w-full border px-4 py-3 text-body outline-none transition-colors focus:border-brand-gold',
        focusRing,
        error ? errorClasses[variant] : variantClasses[variant],
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';
