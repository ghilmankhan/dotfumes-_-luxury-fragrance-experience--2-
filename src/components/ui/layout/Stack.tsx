import React from 'react';
import { cn } from '../../../lib/utils';

export type StackGap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;

const gapClasses: Record<StackGap, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
};

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column';
  gap?: StackGap;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
}

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

export const Stack: React.FC<StackProps> = ({
  direction = 'column',
  gap = 4,
  align,
  justify,
  className,
  children,
  ...rest
}) => (
  <div
    className={cn(
      'flex',
      direction === 'row' ? 'flex-row' : 'flex-col',
      gapClasses[gap],
      align && alignClasses[align],
      justify && justifyClasses[justify],
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);
