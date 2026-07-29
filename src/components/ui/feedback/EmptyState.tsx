import React from 'react';
import { cn } from '../../../lib/utils';

export type EmptyStateTone = 'light' | 'dark';

const toneClasses: Record<EmptyStateTone, { border: string; title: string; body: string }> = {
  light: {
    border: 'border-on-light-muted',
    title: 'text-on-light-muted',
    body: 'text-on-light-muted',
  },
  dark: {
    border: 'border-on-dark-subtle',
    title: 'text-on-dark-secondary',
    body: 'text-on-dark-muted',
  },
};

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: EmptyStateTone;
  bordered?: boolean;
  /** Override the default title styling (e.g. to match a pre-existing call site exactly). */
  titleClassName?: string;
  /** Override the default description styling. */
  descriptionClassName?: string;
}

/**
 * Shared "nothing here" block — consolidates the CollectionPage no-results
 * panel and CartDrawer empty-cart state into one primitive.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  tone = 'light',
  bordered = true,
  titleClassName,
  descriptionClassName,
  className,
  ...rest
}) => {
  const palette = toneClasses[tone];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-24 text-center',
        bordered && cn('border', palette.border),
        className,
      )}
      {...rest}
    >
      {icon}
      <p className={cn('text-small uppercase tracking-wider', palette.title, titleClassName)}>
        {title}
      </p>
      {description ? (
        <p className={cn('mt-3 max-w-70 text-label leading-6', palette.body, descriptionClassName)}>
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
};
