// Shared Framer Motion (motion/react) durations and eases, derived from the
// values already in use across Hero, BrandStory, CategorySplit,
// SignatureExperience, ProductCard, Modal, Toast, and page-transition blocks.
// Import these into `transition={{ ... }}` props instead of re-typing raw
// numbers/easing arrays per component.
export const easing = {
  // Primary cinematic ease-out — Hero, BrandStory, CategorySplit, Modal, Toast.
  cinematic: [0.16, 1, 0.3, 1] as const,
  // Drawer/dialog slide ease — Modal panel transition.
  drawer: [0.22, 1, 0.36, 1] as const,
  standard: 'easeOut' as const,
};

export const duration = {
  fast: 0.24, // CheckoutPage step transitions
  base: 0.35, // Toast enter/exit
  moderate: 0.48, // OrderConfirmationPage panel entrance
  slow: 0.8, // Navbar reveal
  cinematic: 1.2, // Hero/BrandStory large reveals
} as const;

// Three enforced motion tiers, all sharing the site's single cinematic
// easing curve. Duration is the only axis that changes between tiers —
// this is what "fast" vs "cinematic" is actually allowed to mean.
export const motionTiers = {
  // Interactive/navigation UI switching — CategorySplit hover, category swaps.
  fast: { duration: 0.7, ease: easing.cinematic },
  // Buttons, modals, drawers, toasts.
  normal: { duration: duration.base, ease: easing.cinematic },
  // Hero sections, storytelling reveals — BrandStory, SignatureExperience.
  cinematic: { duration: 1.8, ease: easing.cinematic },
} as const;
