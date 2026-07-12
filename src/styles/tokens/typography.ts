// Shared typography class constants, derived from the classes already in use
// across Hero.tsx, ProductCard.tsx, CartDrawer.tsx, and CheckoutPage.tsx.
// These are string constants only — no new visual scale is introduced.

// Large serif italic display heading (Hero h1).
export const headingXl =
  'font-serif italic leading-[0.9] tracking-[-0.035em] text-white text-[2.55rem] sm:text-[3.3rem] md:text-[5rem] lg:text-[5.6rem]';

// Mid-size serif italic heading (ProductCard h3, CartDrawer/Checkout section titles).
export const headingLg = 'font-serif text-3xl md:text-4xl tracking-tighter italic';

// Small serif italic heading (drawer/aside titles like "Your Selection").
export const headingSm = 'font-serif text-2xl italic tracking-tight';

// Uppercase eyebrow/label text pattern, e.g. Hero eyebrow, ProductCard category label.
export const eyebrowLabel = 'text-[10px] font-semibold uppercase tracking-[0.4em]';

// Smaller eyebrow variant used for section kickers (Footer group titles, checkout steps).
export const eyebrowLabelSm = 'text-[9px] uppercase tracking-[0.3em] font-bold';

// Body copy pattern for supporting paragraph text.
export const bodyCopy = 'text-[11px] uppercase tracking-[0.2em] font-light leading-loose';

// Grouped namespace for token-system consumers (e.g. docs pages) that want
// `typography.headingXl` instead of a named import. Re-exports the same
// six constants above — no additional values, no new visual scale.
export const typography = {
  headingXl,
  headingLg,
  headingSm,
  eyebrowLabel,
  eyebrowLabelSm,
  bodyCopy,
} as const;

export type TypographyToken = keyof typeof typography;
