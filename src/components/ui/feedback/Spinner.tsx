import React from 'react';
import { cn } from '../../../lib/utils';

export type SpinnerSize = 'sm' | 'md';

// sm matches the inline loading spinner previously duplicated in Button.tsx.
const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-5 w-5',
};

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'sm', className, ...rest }) => (
  <span
    aria-hidden="true"
    className={cn(
      'animate-spin rounded-full border border-current border-t-transparent',
      sizeClasses[size],
      className,
    )}
    {...rest}
  />
);
