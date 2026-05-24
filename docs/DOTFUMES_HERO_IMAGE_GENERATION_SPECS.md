# DOTFUMES Hero Image Generation Specs

## Scope
This document defines production-ready visual specs and prompts for a premium DOTFUMES hero refresh without changing backend, checkout logic, admin flow, pricing, stock, or product data.

## Current Diagnosis (From Live Code)

### Current hero/image sources
- Home hero image: `src/components/home/Hero.tsx` uses `heroProduct.images.angle` from first product in `FEATURED_PRODUCTS`.
- Product image source mapping: `src/constants/products.ts`.
- Collection hero image: `src/pages/CollectionPage.tsx` uses `COLLECTION_IMAGES.familyMood` from `src/constants/images.ts`.
- About/The House hero image: `src/pages/AboutPage.tsx` also uses `COLLECTION_IMAGES.familyMood`.
- Product cards and product hero panels use white-background packshots (`front`, `angle`, `flatLay`) plus lifestyle images.

### Core visual issue
Many key packshots are explicitly `*-white-bg.webp` assets. When placed inside dark/obsidian campaign sections, they read as detached cutouts and create the "white square" visual break.

### White-background packshots
Examples:
- `/public/images/products/*/*-front-white-bg.webp`
- `/public/images/products/*/*-three-quarter-angle-white-bg.webp`
- `/public/images/products/*/*-top-down-flat-lay-white-bg.webp`
- `/public/images/collections/family/dotfumes-collection-all-five-bottles-line-up-white-bg.webp`
- Collection duo/trio `*-white-bg.webp` sets.

### Cinematic/lifestyle assets already present
- `.../collections/family/dotfumes-collection-family-mood-hero-obsidian-cinematic.webp`
- Product lifestyle shots like:
  - `dotfumes-bold-decision-lifestyle-leadership-dusk-walnut-desk.webp`
  - `dotfumes-wild-silence-lifestyle-volcanic-plain-twilight.webp`
  - `dotfumes-bleu-heat-lifestyle-boxing-gym-dawn-athletic.webp`

### Issue classification
- CODE FIX candidates:
  - Text-safe overlays, gradient masks, object-position tuning, depth layers.
  - Collection/About text-vs-image contrast and crop controls.
- IMAGE FIX candidates:
  - Home hero image replacing white cutout-based composition.
  - Collection hero variant with left-safe copy zone.
  - About split image tuned for right-panel crop.
- PROMPT FIX candidates:
  - New generated campaign plates with controlled negative space.

---

## Concept Directions

## Concept A: Obsidian Maison Hero (Recommended)
Visual: Dark editorial campaign plate with refined smoke, amber rim light, and text-safe left third. Product object cluster sits right/center.

Pros:
- Solves white-square issue immediately.
- Strong premium first impression.
- Easiest to maintain text readability at all breakpoints.

Cons:
- Requires at least one new hero image.

Best use:
- Home hero primary.

Asset need:
- New generated image required.

Mobile behavior:
- Keep subject centered-right on desktop; shift toward center on mobile with preserved left/top readable text zone.

Desktop behavior:
- Left third reserved for headline/subcopy/CTA.

---

## Concept B: Singular Bottle Icon Hero
Visual: Single dominant bottle on dark reflective surface with subtle haze and controlled specular highlights; minimal scene clutter.

Pros:
- Very clear product dominance.
- Strong conversion focus.

Cons:
- Label fidelity risk in generation.
- Can feel sterile if atmosphere is too minimal.

Best use:
- Home hero alternate or product-focused campaign slot.

Asset need:
- New generated image required (or background plate + manual compositing).

Mobile behavior:
- Center bottle, allow top text pocket with stronger overlay.

Desktop behavior:
- Bottle right-of-center, left copy safe zone.

---

## Concept C: Collection Campaign Hero
Visual: Five-bottle family composition, controlled hierarchy, dark gradient, and explicit text-safe left third. No label/text competition.

Pros:
- Communicates collection breadth fast.
- Good for `/collection` and optional `/about` adaptation.

Cons:
- Multi-object scenes can get busy if not tightly art-directed.

Best use:
- Collection hero.

Asset need:
- New generated image required.

Mobile behavior:
- Reduce visible bottle count priority by crop; preserve headline contrast.

Desktop behavior:
- Bottles staged center-right, negative space left.

---

## Recommended Direction
Choose **Concept A (Obsidian Maison Hero)** for home. Pair with Concept C for collection and a dedicated split-safe portrait variant for About.

Reason:
- Highest luxury impact.
- Most reliable readability.
- Best fix for current dark-theme/white-cutout conflict.

---

## Production Asset Specs

### 1) Home Hero
- Filename: `dotfumes-home-hero-obsidian-maison-2560x1440.webp`
- Target size: `2560x1440` (primary), optional `2400x1600` variant
- Aspect ratio: `16:9` (or `3:2` fallback)
- Composition: left 35-40% low-detail negative space for headline
- Subject zone: right/center 45-55%
- Target file weight: `<= 550 KB` visually lossless WebP

### 2) Collection Hero
- Filename: `dotfumes-collection-hero-textsafe-five-bottles-2560x1440.webp`
- Target size: `2560x1440`
- Aspect ratio: `16:9`
- Composition: five-bottle family staged center-right, text-safe left third
- Target file weight: `<= 650 KB`

### 3) About Hero (Split Layout)
- Filename: `dotfumes-about-hero-maison-split-1800x2400.webp`
- Target size: `1800x2400` (or `1600x2000`)
- Aspect ratio: `3:4` portrait
- Composition: right-weighted focal area with calm mid-tone pocket for overlay transitions
- Target file weight: `<= 500 KB`

### 4) Optional Product Stage Plate (Reusable)
- Filename: `dotfumes-product-stage-obsidian-reflection-2000x2500.webp`
- Target size: `2000x2500`
- Aspect ratio: `4:5`
- Use: visual base behind existing packshots to avoid pasted look

---

## Image-Generation Prompt Set

## Global negative prompt constraints
Use with all prompts:
- No watermark
- No random brand names
- No distorted logos
- No fake readable label text
- No bright white studio square background
- No hands/faces unless requested
- No cluttered typography inside scene

## Prompt 1: Home Hero (Obsidian Maison)
"Ultra-premium luxury perfume campaign background, dark obsidian editorial set, cinematic low-key lighting, warm amber rim light, subtle volumetric smoke, polished glass reflections, deep blacks with controlled highlights, text-safe negative space on left third, subject emphasis center-right, minimal clutter, high-end fashion campaign mood, photorealistic, sharp but soft filmic contrast, no watermark, no text, no logos, no label typography."

Technical directives:
- Output: `2560x1440`
- Style: photorealistic editorial campaign
- Keep left side clean for headline and CTA

## Prompt 2: Collection Hero (Five Bottles Text-Safe)
"Luxury fragrance collection campaign scene with five premium perfume bottles staged in a balanced family composition, dark obsidian environment, warm amber accents, subtle smoke layers, elegant glass reflections, left third intentionally clean for typography, center-right bottle grouping, high-end ecommerce hero composition, photorealistic, no watermark, no text, no fake labels, no extra bottles beyond five."

Technical directives:
- Output: `2560x1440`
- Keep label areas non-readable or neutral to avoid artifacts

## Prompt 3: About Hero (Maison Split Portrait)
"High-end fragrance house editorial portrait scene, moody black and charcoal palette, soft amber edge light, refined texture gradients, right-weighted composition for split-screen layout, subtle cinematic depth, minimalist luxury atmosphere, photorealistic, no watermark, no text, no logos, no fake label typography."

Technical directives:
- Output: `1800x2400`
- Preserve clean tonal transitions for overlay gradient on left side in UI

## Fallback Prompt (Background Plate Only)
"Dark luxury perfume campaign background plate only, no bottle labels, no text, no logos, obsidian surface, soft amber reflections, subtle haze, text-safe left third, photorealistic, premium editorial lighting."

Use when generator cannot render reliable bottle label details.

---

## Label Integrity Rule
If the generator cannot preserve brand-accurate text, prefer:
1. Background plate only, or
2. Bottle silhouette with no readable label text, or
3. Dark composition where label area is intentionally soft.

Do not ship fake or misspelled brand labels.

---

## Expected Output Paths (After User-Provided Generation)
Place approved files at:
- `public/images/generated/hero/dotfumes-home-hero-obsidian-maison-2560x1440.webp`
- `public/images/generated/hero/dotfumes-collection-hero-textsafe-five-bottles-2560x1440.webp`
- `public/images/generated/hero/dotfumes-about-hero-maison-split-1800x2400.webp`

---

## Integration Plan (No Code Applied Yet)
When images are available, implement in one safe batch:
1. Update `src/components/home/Hero.tsx` to use generated home hero plate instead of white-cutout visual as primary hero foundation.
2. Update `src/pages/CollectionPage.tsx` hero to generated collection text-safe campaign image.
3. Update `src/pages/AboutPage.tsx` hero image to portrait split-safe asset.
4. Keep fallback to existing assets if generated files missing.
5. Add object-position + overlay tuning for 375/430/768/1440 breakpoints.
6. Add Playwright screenshot checks for `/`, `/collection`, `/about` across those breakpoints.

