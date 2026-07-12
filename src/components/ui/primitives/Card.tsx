import React from 'react';
import { cn } from '../../../lib/utils';

export type CardVariant = 'light' | 'inset' | 'dark';

const variantClasses: Record<CardVariant, string> = {
  // Bordered white panel — matches CartDrawer line items, AdminPage MetricCard/DataSection.
  light: 'border border-black/10 bg-white',
  // Slightly recessed panel on a neutral background (CartDrawer line-item shell).
  inset: 'border border-neutral-200/80 bg-white',
  // Faint panel on a dark surface — static-page content cards and note callouts.
  dark: 'border border-white/10 bg-white/[0.02]',
};

export interface CardProps
  extends React.HTMLAttributes<HTMLElement>,
    Partial<Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>> {
  variant?: CardVariant;
  /** Render as a different element (e.g. "article", "a", "header") while keeping Card's visual system. Defaults to "div". */
  as?: React.ElementType;
}

export const Card: React.FC<CardProps> = ({
  variant = 'light',
  as: Component = 'div',
  className,
  children,
  ...rest
}) => (
  <Component className={cn(variantClasses[variant], 'p-4', className)} {...rest}>
    {children}
  </Component>
);
