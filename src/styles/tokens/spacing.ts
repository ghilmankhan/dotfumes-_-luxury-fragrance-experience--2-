// Named spacing scale mirroring the Tailwind spacing scale already in use
// (gap-4, px-6, py-24, ...). Use Tailwind classes directly in JSX; this
// exists for the rare non-className consumer (Grid/Stack gap props, JS-driven
// layout math) that needs the same scale as a plain number.
export const spacing = {
  xs: 1,
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  '2xl': 10,
  '3xl': 16,
  '4xl': 24,
} as const;

export type SpacingToken = keyof typeof spacing;
