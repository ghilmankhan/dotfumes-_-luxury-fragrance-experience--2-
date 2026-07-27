// Semantic type scale. Components consume these tokens instead of raw values.
export const micro = 'text-micro';
export const caption = 'text-caption';
export const small = 'text-small';
export const body = 'text-body';
export const heading = 'text-heading';
export const label = 'text-label';
export const title = 'text-title';
export const display = 'text-display';

export const tracking = {
  tight: 'tracking-tight',
  normal: 'tracking-normal',
  wide: 'tracking-wide',
  wider: 'tracking-wider',
  widest: 'tracking-widest',
} as const;

export const headingXl = `font-serif italic leading-none ${tracking.tight} text-brand-white ${display}`;
export const headingLg = `font-serif italic ${tracking.tight} ${title}`;
export const headingSm = `font-serif italic ${tracking.tight} text-2xl`;
export const eyebrowLabel = `${caption} font-semibold uppercase ${tracking.wider}`;
export const eyebrowLabelSm = `${micro} font-bold uppercase ${tracking.wide}`;
export const bodyCopy = `${small} font-light uppercase leading-loose ${tracking.normal}`;

export const typography = {
  micro,
  caption,
  small,
  body,
  heading,
  label,
  title,
  display,
  tracking,
  headingXl,
  headingLg,
  headingSm,
  eyebrowLabel,
  eyebrowLabelSm,
  bodyCopy,
} as const;

export type TypographyToken = keyof typeof typography;
