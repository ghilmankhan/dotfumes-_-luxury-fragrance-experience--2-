# Checkout Design QA

## Reference

- Superdesign project: `22e0c889-f5dd-4680-9bc8-da28eccfb073`
- Approved corrected draft: `c5e005ef-812d-497d-bf94-8c55c97c2ac3`
- Preview: `https://p.superdesign.dev/draft/c5e005ef-812d-497d-bf94-8c55c97c2ac3`
- Tested route: `http://127.0.0.1:3000/checkout`
- Review state: cart with two units, delivery complete, Bank Transfer selected, payment confirmation selected, request ready for manual review.

## Evidence

| Evidence                                                                                        | Viewport / pixel dimensions | Density | State                                        |
| ----------------------------------------------------------------------------------------------- | --------------------------- | ------- | -------------------------------------------- |
| `.tmp/checkout-design-qa-2026-07-30/source-desktop-top-1440.png`                                | 1440 × 1000                 | 1×      | Approved source, opening                     |
| `.tmp/checkout-design-qa-2026-07-30/implementation-desktop-top-1440-final.png`                  | 1432 × 994                  | 1×      | Implementation, opening                      |
| `.tmp/checkout-design-qa-2026-07-30/desktop-comparison-board-final.png`                         | 2900 × 1000                 | 1×      | Source and implementation opening comparison |
| `.tmp/checkout-design-qa-2026-07-30/desktop-payment-comparison-board-final.png`                 | 2900 × 1000                 | 1×      | Source and implementation payment comparison |
| `.tmp/checkout-design-qa-2026-07-30/implementation-desktop-ready-final.png`                     | 1432 × 994                  | 1×      | Complete checkout, ready CTA                 |
| `.tmp/checkout-design-qa-2026-07-30/implementation-desktop-proof-selected-postfix-viewport.png` | 1432 × 994                  | 1×      | Final bounded proof-preview state            |
| `.tmp/checkout-design-qa-2026-07-30/implementation-mobile-collapsed-390-final.png`              | 382 × 827                   | 1×      | Mobile reserved summary collapsed            |
| `.tmp/checkout-design-qa-2026-07-30/implementation-mobile-expanded-390-final.png`               | 382 × 827                   | 1×      | Mobile reserved summary expanded             |

The generated source's mobile capture was blank and its 390 px render overflowed to 403 px. The approved desktop source is therefore the visual truth; mobile was checked against the approved responsive specification, the existing Dotfumes component system, overflow measurements, and the 320 px progress-label regression test.

## Full-view comparison

The implementation preserves the approved composition: restrained reservation opening, low-dominance semantic progress, generous delivery rhythm, calm payment selection, private-confirmation handoff, and a persistent reserved-product surface. Existing Dotfumes inputs, type tokens, borders, product imagery, and summary component behavior remain intact.

## Focused comparison

- Payment retains all three real methods and the exact existing method notes.
- Selection is expressed through the existing black/gold visual language without introducing a new badge or component style.
- The ready state resolves to `Send for Private Review — $440.00`.
- The proof preview is capped by the existing `max-w-sm` utility at 384 CSS px so it remains supporting evidence instead of becoming the visual subject.
- The mobile summary is available before the form and expands without horizontal overflow.

## Comparison history

1. **P2 — Mobile progress-label truncation**
   - Finding: `Private Review` could truncate at 320 px.
   - Fix: changed the progress row to a three-column mobile layout with full labels and hairlines, retaining the desktop horizontal layout.
   - Post-fix evidence: the 320 px regression test confirms every label's content width fits its visible width and no ellipsis is applied.

2. **P2 — Desktop vertical rhythm and summary alignment**
   - Finding: the implementation began too close to the fixed navigation and the reserved summary sat too high relative to the delivery narrative.
   - Fix: increased checkout-only responsive top spacing and aligned the desktop summary with the guided flow using existing spacing utilities.
   - Post-fix evidence: `desktop-comparison-board-final.png`.

3. **P2 — Selected proof preview dominated the flow**
   - Finding: a full-width 4:3 preview carried more visual weight than the private-review copy and CTA.
   - Fix: capped image and PDF preview containers at the existing `max-w-sm` width.
   - Post-fix evidence: `implementation-desktop-proof-selected-postfix-viewport.png`; the automated regression measures the preview container at no more than 384 CSS px.

## Intentional deviations

- Real Dotfumes product data and assets replace source placeholders.
- Existing boxed inputs and their field order are preserved to avoid global design-system or state-flow changes.
- Existing summary serif italics are preserved instead of copying the source's roman placeholder treatment.
- All three supported payment methods remain visible.
- No fabricated account number, wallet identifier, exact server quote, or payment promise was added.
- Exact payment-method notes from the current checkout contract are preserved.
- No “private file” claim was added because the current backend's Drive-sharing behavior does not enforce that promise.

## Severity assessment

- P0: None
- P1: None
- P2: None after the fixes and post-fix comparison

final result: passed
