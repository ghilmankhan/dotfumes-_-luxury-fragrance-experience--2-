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
// Section/summary heading tier — matches the "font-serif text-3xl italic" pattern
// already repeated verbatim across checkout, order confirmation, and editorial pages.
export const headingMd = `font-serif italic text-3xl`;
export const headingSm = `font-serif italic ${tracking.tight} text-2xl`;
// Card/line-item title tier — matches the "font-serif text-xl italic" pattern already
// repeated verbatim across product cards, cart line items, and product detail.
export const headingXs = `font-serif italic text-xl`;
export const eyebrowLabel = `${caption} font-semibold uppercase ${tracking.wider}`;
export const eyebrowLabelSm = `${micro} font-bold uppercase ${tracking.wide}`;
export const bodyCopy = `${body} font-light leading-loose`;
// Compact all-caps CTA button labels (Hero primary/secondary). None of the
// named tracking steps above land in the ~0.08-0.12em range recommended for
// this role (tight -0.035em / normal 0.16em / wide 0.22em / wider 0.35em /
// widest 0.5em all overshoot or undershoot it), so this is defined once here
// instead of an inline arbitrary value per call site.
export const ctaLabelTracking = 'tracking-[0.1em]';

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
  headingMd,
  headingSm,
  headingXs,
  eyebrowLabel,
  eyebrowLabelSm,
  bodyCopy,
  ctaLabelTracking,
} as const;

export type TypographyToken = keyof typeof typography;
