// Thin JS-side mirror of the Tailwind @theme color tokens in src/index.css.
// Use Tailwind utility classes (bg-brand-black, text-brand-gold, ...) in JSX —
// reach for these only where a raw value is required outside className, e.g.
// meta theme-color, canvas/SVG fills, or inline style props.
export const colors = {
  brandBlack: '#0a0a0a',
  brandWhite: '#fdfdfd',
  brandGold: '#c5a059',
  brandIvory: '#f9f8f6',
  brandGray: '#a1a1a1',
} as const;

export type ColorToken = keyof typeof colors;
