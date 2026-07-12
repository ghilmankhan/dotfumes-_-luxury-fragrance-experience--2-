import React from 'react';
import { cn } from '../../../lib/utils';

export type ContainerSize = 'md' | 'lg' | 'xl' | 'full';

// lg matches the repeated `mx-auto w-full max-w-6xl px-6 md:px-16` shell used
// across the static/legal pages (About, Careers, Contact, Faq, Journal,
// Privacy, Returns, Shipping, Sustainability, Terms).
const sizeClasses: Record<ContainerSize, string> = {
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
};

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
}

export const Container: React.FC<ContainerProps> = ({
  size = 'lg',
  className,
  children,
  ...rest
}) => (
  <div className={cn('mx-auto w-full px-6 md:px-16', sizeClasses[size], className)} {...rest}>
    {children}
  </div>
);
