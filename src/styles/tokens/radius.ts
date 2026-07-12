// Dotfumes UI is intentionally hard-edged (zero border-radius on primitives:
// Button, Card, Modal panels) — the one deliberate exception is the
// CartDrawer line-item image frame (rounded-2xl). Documented here so future
// components choose "sharp" by default rather than reaching for a random
// radius value.
export const radius = {
  none: '0px',
  sm: '0.25rem',
  lg: '1rem', // rounded-2xl — CartDrawer line-item frame only.
  full: '9999px', // avatars, dots, spinner.
} as const;

export type RadiusToken = keyof typeof radius;
