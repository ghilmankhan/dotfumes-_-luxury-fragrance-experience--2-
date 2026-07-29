import React from 'react';
import { cn } from '../../../lib/utils';

export type CardVariant = 'light' | 'inset' | 'dark';
export type CardPadding =
  | 'none'
  | 'default'
  | 'comfortable'
  | 'spacious'
  | 'wide'
  | 'responsive'
  | 'lineItem';

const variantClasses: Record<CardVariant, string> = {
  // Bordered white panel — matches CartDrawer line items, AdminPage MetricCard/DataSection.
  light: 'border border-on-light-muted bg-brand-white',
  // Slightly recessed panel on a neutral background (CartDrawer line-item shell).
  inset: 'rounded-2xl border border-neutral-muted bg-brand-white',
  // Faint panel on a dark surface — static-page content cards and note callouts.
  dark: 'border border-on-dark-subtle bg-surface-subtle',
};

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  default: 'p-4',
  comfortable: 'p-6',
  spacious: 'p-8',
  wide: 'px-6 py-4',
  responsive: 'p-6 md:p-8',
  lineItem: 'px-3 py-3 md:px-4 md:py-4',
};

export interface CardProps
  extends
    React.HTMLAttributes<HTMLElement>,
    Partial<Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>> {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Render as a different element (e.g. "article", "a", "header") while keeping Card's visual system. Defaults to "div". */
  as?: React.ElementType;
}

export const Card: React.FC<CardProps> = ({
  variant = 'light',
  padding = 'default',
  as: Component = 'div',
  className,
  children,
  ...rest
}) => (
  <Component className={cn(variantClasses[variant], paddingClasses[padding], className)} {...rest}>
    {children}
  </Component>
);
