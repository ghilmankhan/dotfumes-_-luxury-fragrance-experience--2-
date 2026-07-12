import React from 'react';
import { cn } from '../../../lib/utils';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Column counts per breakpoint, e.g. { base: 1, md: 2, xl: 4 } (AdminPage metrics grid). */
  cols?: { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
}

const colsMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

const smColsMap: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
};

const mdColsMap: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};

const lgColsMap: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

const xlColsMap: Record<number, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
};

const gapMap = {
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
};

export const Grid: React.FC<GridProps> = ({ cols = {}, gap = 4, className, children, ...rest }) => (
  <div
    className={cn(
      'grid',
      gapMap[gap],
      cols.base && colsMap[cols.base],
      cols.sm && smColsMap[cols.sm],
      cols.md && mdColsMap[cols.md],
      cols.lg && lgColsMap[cols.lg],
      cols.xl && xlColsMap[cols.xl],
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);
