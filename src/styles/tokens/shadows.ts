// Unified elevation scale. Every UI surface shadow site-wide (cards, drawers,
// panels, hero surfaces) resolves to one of these four Tailwind utilities —
// backed by the `--shadow-sm/md/lg/xl` vars in src/index.css's @theme block.
// Do not add new shadow-[...] / drop-shadow-[...] arbitrary values for surface
// elevation; pick the closest tier below instead.
export const shadows = {
  sm: 'shadow-sm', // Subtle UI elements — buttons, sticky navbar bar.
  md: 'shadow-md', // Default card surfaces — CheckoutPage order summary.
  lg: 'shadow-lg', // Elevated/emphasis surfaces — drawers, modals, toasts,
  // ProductCard quick-add panel, OrderConfirmationPage panels, BrandStory caption card.
  xl: 'shadow-xl', // Hero / cinematic surfaces — SignatureExperience hero panel, BrandStory portrait.
} as const;

export type ShadowToken = keyof typeof shadows;

// Deliberate exceptions, kept as art-directed arbitrary values rather than
// collapsed into the elevation scale, because they solve a different problem
// than surface elevation:
// - ProductCard/ProductPage/CollectionPage bottle `drop-shadow-[...]`: a CSS
//   `filter`, not `box-shadow` — follows the transparent PNG's silhouette.
//   A box-shadow utility would draw a rectangle behind the bottle instead.
// - ProductCard image-well `shadow-[inset_0_0_80px...]`: an inset ambient
//   occlusion effect inside the photography stage, not a raised/elevated surface.
// - ProductPage mobile sticky add-to-cart bar `shadow-[0_-14px_45px...]`: an
//   upward-cast shadow for a bar docked to the bottom of the viewport — the
//   scale above is downward-cast only, so this direction can't be expressed
//   by shadow-sm/md/lg/xl without looking physically wrong.
