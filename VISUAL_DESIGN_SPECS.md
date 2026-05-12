# CINEMATIC HERO VISUAL DESIGN SPECIFICATIONS

## 🎨 COLOR SPECIFICATIONS (HEX + RGBA)

### Primary Brand Colors
```
Brand Black          #0a0a0a      RGB(10, 10, 10)       (Background)
Brand White          #fdfdfd      RGB(253, 253, 253)    (Primary Text)
Brand Gold           #c5a059      RGB(197, 160, 89)     (Accent, Glow)
Brand Gray           #a1a1a1      RGB(161, 161, 161)    (Secondary Text)
```

### Atmospheric Background Gradient
```
Top Color:    #1a1815      RGB(26, 24, 21)   (Warm dark)
Mid Color:    #0f0d0a      RGB(15, 13, 10)   (Very dark)
Bottom Color: #0a0905      RGB(10, 9, 5)     (Deep black)
```

### Volumetric Glow Colors
```
Warm Amber Glow
  Color:     rgba(197, 160, 89, 0.15-0.22)     (Brand gold, transparent)
  Blur:      140-160px
  Duration:  12 seconds
  Opacity:   0.12 → 0.22 → 0.12

Cool Blue-White Glow
  Color:     rgba(97, 118, 150, 0.08-0.14)     (Slate blue)
  Blur:      160px
  Duration:  14 seconds (1s delay)
  Opacity:   0.08 → 0.14 → 0.08

Soft Smoke Drift
  Color:     rgba(255, 255, 255, 0.05-0.10)    (White haze)
  Blur:      150px
  Duration:  16 seconds (2s delay)
  Opacity:   0.06 → 0.12 → 0.06
```

### Text Colors
```
Headline Text:           #fdfdfd              (Brand white, 100%)
Primary Metadata:        #c5a059              (Brand gold, 80% opacity)
Secondary Metadata:      #fdfdfd with /45     (White, 45% opacity)
Description Text:        #a1a1a1 with /90     (Brand gray, 90% opacity)
Notes Grid:              #fdfdfd with /70     (White, 70% opacity)
Button Text (default):   #fdfdfd              (Brand white)
Button Text (hover):     #c5a059              (Brand gold)
```

### Borders & Shadows
```
Bottle Glow (Outer):     0 0 80px rgba(197, 160, 89, 0.15)
Bottle Glow (Animated):  0 0 120px rgba(197, 160, 89, 0.22)
Bottle Inset:            inset -20px -20px 60px rgba(0,0,0,0.3-0.4)
Drop Shadow 1:           0 40px 60px rgba(0,0,0,0.5)
Drop Shadow 2:           0 50px 80px rgba(0,0,0,0.6)
Soft Shadow:             0 20px 40px rgba(0,0,0,0.3-0.4)

Border Colors:
  Input Border:          rgba(255, 255, 255, 0.10)    (Default)
  Input Border (hover):  rgba(197, 160, 89, 0.40)     (Gold tint)
```

---

## 📏 TYPOGRAPHY SPECIFICATIONS

### Font Family
```
Primary (Headings):      'Playfair Display'
  Weights:    400 (Regular), 300 (Light)
  Styles:     Normal, Italic
  Source:     Google Fonts (preloaded)

Secondary (Body):        'Inter'
  Weights:    100, 300, 400, 500, 600, 700, 900
  Styles:     Normal only
  Source:     Google Fonts (preloaded)
```

### Headline Typography
```
DESKTOP (1024px+):
  Size:       7rem (112px)
  Weight:     400 italic (first word), 300 light (second word)
  Tracking:   -0.04em (tight)
  Line-height: 0.9 (compact)
  Max-width:  2xl container
  Color:      White (#fdfdfd)
  Transform:  none

TABLET (768px - 1023px):
  Size:       5.5rem (88px)
  Weight:     400 italic, 300 light
  Tracking:   -0.04em
  Line-height: 0.9
  Color:      White (#fdfdfd)

MOBILE (< 768px):
  Size:       3.5rem (56px)
  Weight:     400 italic, 300 light
  Tracking:   -0.04em
  Line-height: 0.9
  Color:      White (#fdfdfd)
```

### Metadata Typography
```
Label (Limited Extrait):
  Size:       10px (desktop), 9px (mobile)
  Weight:     600 (semibold)
  Transform:  UPPERCASE
  Tracking:   0.7em (70px per 100px)
  Color:      #c5a059 with 80% opacity
  Font:       Inter (sans-serif)

Divider Line:
  Height:     1px
  Color:      Gradient: gold/60 → transparent
  Width:      4rem (desktop), 3rem (mobile)
```

### Body & Description Typography
```
Description Text:
  Size:       15px (desktop), 14px (tablet), 13px (mobile)
  Weight:     300 (light)
  Line-height: 2 (32px desktop)
  Tracking:   0.015em (normal with slight expansion)
  Color:      #a1a1a1 with 90% opacity
  Font:       Inter
  Max-width:  md container (28rem)

Fragrance Notes Label:
  Size:       8px
  Weight:     600 (semibold)
  Transform:  UPPERCASE
  Tracking:   0.4em (40px per 100px)
  Color:      #c5a059 with 60% opacity

Fragrance Notes Value:
  Size:       12px
  Weight:     400 (regular)
  Line-height: 1.5
  Color:      #fdfdfd with 70% opacity
  Font:       Inter light
```

### Button Typography
```
CTA Button Text:
  Size:       12px (desktop), 11px (tablet), 10px (mobile)
  Weight:     600 (semibold)
  Transform:  UPPERCASE
  Tracking:   0.5em (50px per 100px)
  Color:      White (default), Gold (hover)
  Font:       Inter
  Transition: 500ms duration

Scroll Indicator:
  Size:       9px
  Weight:     600 (semibold)
  Transform:  UPPERCASE
  Tracking:   0.3em
  Color:      White with 30% opacity
  Font:       Inter
```

---

## 🎬 ANIMATION & EASING SPECIFICATIONS

### Premium Easing Curve
```
Function:              cubic-bezier(0.16, 1, 0.3, 1)
Effect:                Smooth entrance with slight overshoot, refined exit
Duration:              1.0-1.4 seconds (for entrances)
Used On:               Headline, primary reveals, bottle entrance
```

### Standard Easing (Infinite Loops)
```
Function:              easeInOut
Effect:                Symmetrical acceleration/deceleration
Duration:              6-16 seconds (varies by loop)
Used On:               Atmospheric glows, pulse animations
```

### Timing Specifications
```
ENTRANCE SEQUENCE (Sequential):
  Metadata:     duration 0.8s   | delay 0.4s  | ease: easeOut
  Headline:     duration 1.0s   | delay 0.5s  | ease: premium
  Description:  duration 0.9s   | delay 0.7s  | ease: easeOut
  Bottle:       duration 1.4s   | delay 0.3s  | ease: premium
  Notes Grid:   duration 0.85s  | delay 0.9s  | ease: easeOut
  CTA:          duration 0.8s   | delay 1.1s  | ease: easeOut

INFINITE LOOPS (Simultaneous):
  Warm Glow:    12s infinite   | easeInOut   | opacity 0.12→0.22→0.12
  Cool Glow:    14s infinite   | easeInOut   | delay 1s
  Smoke:        16s infinite   | easeInOut   | delay 2s
  Bottle Glow:  8s infinite    | easeInOut   | shadow blur 80-120px
  Headline:     6s infinite    | easeInOut   | opacity 0.6→0.9→0.6 (second word)
  Haze:         10s infinite   | easeInOut   | opacity 0.08→0.15→0.08

INTERACTIVE (On Hover/Scroll):
  CTA Hover:    700ms          | ease: premium | background slide-in
  Scroll Para:  continuous     | ease: linear  | offset-based transforms
```

### Animation Values
```
ENTRANCE TRANSFORMS:
  Fade:  opacity 0 → 1
  Slide: Y translation -20px to -40px → 0
  Scale: scale 0.92 → 1 (bottle only)

INFINITE LOOP RANGES:
  Opacity:       0.06 to 0.22 (varies per element)
  Transform Y:   0 to -8px (subtle movement)
  Box Shadow:    80px to 120px blur radius
  Scale:         1.0 to 1.1 (atmospheric elements)

SCROLL PARALLAX:
  Background:    opacity 1 → 0.3
  Bottle:        Y translation 0% to -6%
  Text:          Y translation 0% to -8%
  All opacity:   1 → 0.15-0.20
```

---

## 📐 SPACING & LAYOUT SPECIFICATIONS

### Container Dimensions
```
Full Hero Height:        100vh (viewport height)
Max Content Width:       1600px
Viewport Padding (mobile):   1.5rem (24px, px-6)
Viewport Padding (tablet):   3rem (48px, px-12)
Viewport Padding (desktop):  6rem (96px, px-24)
```

### Component Spacing
```
Metadata to Headline:    3rem (desktop), 2rem (mobile)
Headline to Description: 2.5rem (desktop), 1.5rem (mobile)
Description to Notes:    2rem (desktop), 1rem (mobile)
Notes Grid Gap:          2rem (desktop), 1rem (mobile)
Bottom Padding (hero):   4-5rem (for scroll indicator clearance)
```

### Bottle Positioning
```
Desktop:
  Width:    384px (max-w-96)
  Position: Centered (absolute center of viewport)
  Z-index:  30
  Glow Radius: -3rem inset (48px around bottle)

Tablet:
  Width:    352px (adjusted)
  Position: Centered
  Z-index:  30

Mobile:
  Width:    320px (80 to 96 depending on screen)
  Position: Centered
  Z-index:  30
  Scale:    responsive fit
```

### Typography Positioning
```
Metadata Label:
  Position: absolute top-left
  Offset:   variable based on viewport
  Max-width: unconstrained

Headline:
  Position: absolute, left-aligned
  Offset:   variable padding
  Max-width: 40rem (desktop), 28rem (mobile)

Description:
  Position: below headline
  Max-width: 28rem
  Margin:    top 2.5rem (desktop)

Fragrance Notes:
  Position: below description
  Layout:   3-column grid
  Gap:      2rem (desktop), 1rem (mobile)
  Max-width: individual columns unconstrained

CTA Button:
  Position: absolute bottom-12 to bottom-20 (responsive)
  X-align:  centered
  Pointer:  enabled (pointer-events-auto)

Scroll Indicator:
  Position: absolute bottom-8 (32px from bottom)
  X-align:  centered
  Pointer:  disabled (pointer-events-none)
```

---

## 🖼️ IMAGE SPECIFICATIONS

### Bottle Image
```
Source Path:     /images/products/[slug]/[product]-angle.webp
Aspect Ratio:    3:4 (portrait, bottle-shaped)
Format:          WebP (primary), JPG (fallback)
Sizes Attribute: "(max-width: 768px) 300px, 400px"
Load Priority:   high (fetchPriority="high")
Dimensions:      300px width (mobile) to 400px width (desktop)
Alt Text:        "[Product Name] - Ultra-premium luxury fragrance"
Optimization:    Handled by AssetImage component
```

### Background Gradient
```
Type:            Linear gradient
Direction:       180deg (top to bottom)
Color 1:         #1a1815 (top, 0%)
Color 2:         #0f0d0a (middle, 50%)
Color 3:         #0a0905 (bottom, 100%)
Texture:         Grain overlay at 4px × 4px, 40% opacity
```

---

## 🎯 RESPONSIVE BREAKPOINTS

### Tailwind Breakpoints Used
```
sm:  640px   (not used in hero)
md:  768px   (tablet) — Primary transition point
lg:  1024px  (desktop) — Secondary scale point
xl:  1280px  (large desktop) — Text size increase
2xl: 1536px  (extra large) — Not specifically used

Hero Adapts At:
  Default (0px):    Mobile layout
  md (768px):       Tablet layout
  lg (1024px):      Desktop layout
```

### Layout Changes by Breakpoint
```
MOBILE (< 768px):
  - Stacked vertical composition
  - Centered bottle
  - Typography below bottle
  - Smaller text sizes
  - Full-width padding

TABLET (768px - 1023px):
  - Similar to mobile with more breathing room
  - Slightly larger text
  - Adjusted spacing

DESKTOP (≥ 1024px):
  - Full asymmetrical editorial layout
  - Bottle centered
  - Typography left-aligned (absolute positioning)
  - Maximum visual impact
  - Full animation intensity
```

---

## ⚙️ TECHNICAL RENDERING SPECIFICATIONS

### CSS Properties (GPU-Accelerated)
```
Animated Properties Only:
  - transform (translateX, translateY, scale, rotate)
  - opacity

Avoided During Animation:
  - width, height (layout thrashing)
  - filter (blur, brightness) — except as fallback
  - margin, padding (reflows)
  - top, left, right, bottom (repaints)

GPU Hints:
  - will-change: transform, opacity
  - transform: translateZ(0)
  - backface-visibility: hidden (implicit)
```

### Browser Rendering Performance
```
Target Frame Rate:       60 FPS
Acceptable Minimum:      30 FPS (mobile fallback)
Animation Latency:       < 16ms per frame
Paint Frequency:         No more than once per animation frame

Performance Requirements:
  - No layout recalculation during animation
  - No composite layer thrashing
  - GPU rasterization on modern devices
  - Respects system resources on low-end devices
```

---

## 🎨 DESIGN SYSTEM INTEGRATION

### Consistency Rules
```
All text uses brand fonts:     ✓ Serif or Sans (never other)
All colors are from palette:   ✓ No random hex values
All spacing uses rem units:    ✓ Scalable, not px
Animations use premium easing: ✓ Consistent feel
Hover states are subtle:       ✓ Never aggressive
```

### Future-Proofing
```
Color variables in CSS:        Enables brand updates
Typography scale:              Responsive, not hardcoded
Animation timings:             Centralized, easy to adjust
Component structure:           Isolated, no cascade conflicts
Documentation:                 Complete for handoffs
```

---

## ✨ FINAL VISUAL PRINCIPLES

1. **Cinematic Lighting** — Warm + cool glows create dimensional depth
2. **Luxury Restraint** — Less is more; negative space is valuable
3. **Editorial Hierarchy** — Typography tells a story
4. **Premium Motion** — Animation feels intentional, not trendy
5. **Physical Realism** — Bottle feels grounded, not floating
6. **Color Psychology** — Gold accents evoke luxury and prestige
7. **Atmospheric Immersion** — User feels they've entered a world

---

**Version**: 1.0  
**Last Updated**: May 12, 2026  
**Status**: Design Locked ✓
