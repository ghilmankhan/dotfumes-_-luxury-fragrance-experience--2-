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
  inkFaint: 'rgb(10 10 10 / 0.02)',
  inkSubtle: 'rgb(10 10 10 / 0.03)',
  inkMuted: 'rgb(10 10 10 / 0.04)',
  surfaceMuted: 'rgb(253 253 253 / 0.03)',
  surfaceRaised: 'rgb(253 253 253 / 0.06)',
  surfaceSubtle: 'rgb(253 253 253 / 0.02)',
  textOnDarkFaint: 'rgb(253 253 253 / 0.2)',
  textOnDarkSubtle: 'rgb(253 253 253 / 0.4)',
  textOnDarkMuted: 'rgb(253 253 253 / 0.55)',
  textOnDarkSecondary: 'rgb(253 253 253 / 0.72)',
  textOnDarkStrong: 'rgb(253 253 253 / 0.9)',
  textOnLightFaint: 'rgb(10 10 10 / 0.28)',
  textOnLightMuted: 'rgb(10 10 10 / 0.55)',
  textOnLightSecondary: 'rgb(10 10 10 / 0.65)',
  textOnLightStrong: 'rgb(10 10 10 / 0.75)',
  borderOnDarkSubtle: 'rgb(253 253 253 / 0.1)',
  borderOnDarkMuted: 'rgb(253 253 253 / 0.2)',
  borderOnDarkStrong: 'rgb(253 253 253 / 0.5)',
  borderOnLightSubtle: 'rgb(10 10 10 / 0.05)',
  borderOnLightMuted: 'rgb(10 10 10 / 0.1)',
  borderOnLightStrong: 'rgb(10 10 10 / 0.3)',
  surfaceOverlaySubtle: 'rgb(10 10 10 / 0.2)',
  surfaceOverlayMuted: 'rgb(10 10 10 / 0.35)',
  surfaceOverlayStrong: 'rgb(10 10 10 / 0.6)',
  surfaceGlassSubtle: 'rgb(253 253 253 / 0.05)',
  surfaceGlassMuted: 'rgb(253 253 253 / 0.2)',
  surfaceLightRaised: 'rgb(253 253 253 / 0.95)',
  accentGoldSubtle: 'rgb(197 160 89 / 0.1)',
  accentGoldMuted: 'rgb(197 160 89 / 0.2)',
  accentGoldStrong: 'rgb(197 160 89 / 0.6)',
} as const;

export const gradients = {
  accent: 'linear-gradient(90deg, var(--color-brand-gold), transparent)',
  hero: 'linear-gradient(90deg, var(--color-brand-black), transparent)',
  surface: 'linear-gradient(180deg, var(--color-surface-raised), var(--color-surface-subtle))',
} as const;

export type ColorToken = keyof typeof colors;
export type GradientToken = keyof typeof gradients;
