// Shared interaction-state class constants — single source for focus rings
// and touch-target sizing, previously duplicated inline across Button.tsx,
// ProductCard.tsx, Navbar.tsx, CartDrawer.tsx, and CartLineItem.tsx.
export const focusRing =
  'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-gold';

// Minimum touch-target size on mobile, reset to natural size at desktop
// breakpoints where hover/pointer precision makes the larger hit area unnecessary.
export const touchTarget = 'min-h-11 min-w-11 md:min-h-0 md:min-w-0';

export const interactive = {
  focusRing,
  touchTarget,
} as const;

export type InteractiveToken = keyof typeof interactive;
