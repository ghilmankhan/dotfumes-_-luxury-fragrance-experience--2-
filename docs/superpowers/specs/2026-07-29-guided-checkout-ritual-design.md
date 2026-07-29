# Dotfumes Private Fragrance Reservation Ritual

**Date:** 2026-07-29
**Status:** Revised design for user review
**Scope:** Checkout perception, copy, hierarchy, spacing, and interaction feel only

## 1. Objective

Transform the existing checkout from a visible verification form into a private fragrance reservation ritual.

The customer should feel:

> A private fragrance house is holding my selection and guiding me through a personally handled order.

The customer should not feel:

> I am completing a multi-step payment form for an internal system.

The implementation must preserve the existing:

- `INTENT -> DELIVERY -> PAYMENT -> PROOF -> CONFIRMATION` flow;
- quote and pricing behavior;
- backend and API contracts;
- idempotency behavior;
- validation and state-machine logic;
- payment and order status behavior;
- field names, order, autofill contracts, and submission payload;
- Dotfumes tokens, typography, sharp geometry, and brand identity.

## 2. Hard Scope Boundary

### Allowed

- Checkout copy and labels.
- Visual hierarchy and spacing.
- CTA labels and supporting guidance.
- Presentation of payment instructions.
- Presentation of payment proof.
- Order-summary placement and product storytelling.
- Motion used to communicate existing state changes.
- Responsive composition inside the checkout route.
- Accessibility refinements that do not alter business logic.

### Not allowed

- Backend or Apps Script changes.
- API contract changes.
- New state-machine states.
- Pricing or quote changes.
- Zustand ownership changes.
- Validation-rule changes.
- New persistence or architecture layers.
- New design tokens, fonts, colors, radii, shadows, or icon families.
- Changes outside checkout.

### Explicitly excluded files

The implementation plan must not modify:

- `apps-script/**`;
- `src/lib/googleSheetsBackend.ts`;
- `src/services/orderSubmissionService.ts`;
- pricing, quote, idempotency, order-status, or inventory logic;
- Zustand store state shapes;
- backend payload types.

Apps Script and Zustand guidance are guardrails for verifying this boundary, not implementation targets.

## 3. Evidence-Based UX Reality Audit

The current flow was captured in the in-app browser at:

- desktop: `1440 x 1000`;
- mobile: `390 x 844`.

Audit evidence is stored locally in:

`/.tmp/checkout-audit-2026-07-29/`

### Step 1: Checkout arrival

**Health:** Needs major perception refinement.

The opening uses a campaign-sized heading and 2 explanatory paragraphs before the customer reaches any action. It names the mechanics of payment proof and handoff too early.

Emotional effect:

- desire changes into paperwork;
- the product is not the opening subject;
- the customer is told what the system needs before being reassured what Dotfumes is doing for them.

### Step 2: Product selection in checkout

**Health:** Functional on desktop, emotionally weak.

The sticky summary keeps the product visible, which is a good foundation. However, it reads as a receipt:

- title is `Your Selection`;
- product line emphasizes price and SKU;
- no scent cue remains;
- no reservation language exists;
- inventory and quantity controls carry more visual weight than product desire.

On mobile, the summary appears after the complete form and payment flow. The product therefore disappears during the highest-friction part of the journey.

### Step 3: Delivery details

**Health:** Usable but form-heavy.

The large input grid, tracked labels, step numbers, progress cards, and generous control height make the page feel like a long application.

The customer sees:

- a large heading;
- 2 progress cards;
- a numbered section heading;
- 6 equally prominent controls.

This repeats system structure instead of creating a calm guided rhythm.

### Step 4: Payment selection

**Health:** Clear selection, weak trust transition.

The selected method receives strong contrast, but the copy immediately talks about attaching proof. It does not frame the payment moment as a calm, exact handoff.

The visual sequence feels like:

`choose method -> upload file`

It should feel like:

`choose method -> receive exact private details -> complete transfer with confidence`

### Step 5: Proof handover

**Health:** Technically understandable, emotionally clinical.

`Payment Proof Upload`, file formats, and the file-size limit lead the section. Privacy and manual handling appear later in a separate information card.

The customer is asked for a file before the interface first establishes:

- why the proof is needed;
- who reviews it;
- that it is privately handled;
- that the order has a trackable identity.

### Step 6: Final CTA

**Health:** Blocking.

The grey `Place Order Request` control reads as unavailable and gives no clear next action. The paragraph beneath it claims that the request is sent now before submission has happened.

This creates the strongest trust break in the flow:

- the interface appears stuck;
- the CTA language is administrative;
- the supporting copy contradicts the visible state.

## 4. Emotional Problems Map

| Moment | Current perception | Emotional cost | Target perception |
| --- | --- | --- | --- |
| Arrival | Checkout instructions | Desire drops | Private reservation begins |
| Progress | Numbered task cards | System awareness rises | Quiet orientation |
| Delivery | Dense form grid | Effort feels large | Concierge gathers delivery details |
| Product summary | Receipt and stock controls | Product emotion fades | Fragrance is held and protected |
| Payment | Method selection | Anxiety about what happens next | Exact details are shared calmly |
| Proof | File upload | Privacy uncertainty | Secure handover to the house |
| CTA | Disabled request button | User feels blocked | Clear invitation to the next useful action |
| Completion | Operational handoff | Uncertain closure | Personally handled review |

## 5. Visual Approaches Considered

### A. Quiet Reservation Layer

**Recommended.**

Preserve the current light checkout, sharp geometry, serif display type, and gold accent. Reduce step chrome, make the product summary feel held, and use calm concierge copy.

Advantages:

- best fit with the existing Dotfumes system;
- smallest implementation risk;
- strongest luxury effect through restraint;
- no new visual language;
- works with the existing state machine.

Trade-off:

- depends on excellent copy and spacing rather than dramatic visual novelty.

### B. Editorial Gallery Checkout

Use a more image-led composition with a larger product still life and a narrower form column.

Advantages:

- keeps desire visibly alive;
- strong luxury-editorial effect.

Trade-offs:

- greater layout change;
- may reduce form efficiency;
- higher responsive risk;
- product image could compete with payment clarity.

### C. Concierge Note-Led Checkout

Use more conversational messages between stages and treat each section as a short exchange.

Advantages:

- strongest human tone;
- makes manual review feel intentional.

Trade-offs:

- can become verbose;
- risks sounding theatrical or artificial;
- more copy can increase vertical length.

### Decision

Proceed with **Quiet Reservation Layer**, using only a small amount of Concierge Note language.

## 6. Target Experience

### Design read

Preservation redesign for high-intent fragrance buyers, with a private-house, trust-first language.

### Design dials

- `DESIGN_VARIANCE: 6`
- `MOTION_INTENSITY: 4`
- `VISUAL_DENSITY: 3`

### Target emotional sequence

1. **Desire:** the fragrance remains the subject.
2. **Reassurance:** the selection is being held.
3. **Guidance:** one calm next action is always clear.
4. **Trust:** payment details are exact and privately shared.
5. **Control:** proof is framed as a secure handover.
6. **Closure:** the house takes responsibility for manual review.

## 7. Checkout Composition

### 7.1 Opening

Replace the campaign-sized checkout introduction with a compact private-order opening.

Recommended copy:

- Eyebrow: `Private Order`
- Heading: `Your selection, reserved.`
- Support: `We will hold your fragrances while you complete a private, manually reviewed order.`

Rules:

- one heading;
- one support line;
- no early mention of file types, WhatsApp, email, or system mechanics;
- opening and first delivery control visible in the first desktop viewport;
- product summary visible beside the opening on desktop;
- product summary immediately follows the opening on mobile.

### 7.2 Progress

Keep semantic progress behavior but reduce its visual dominance.

Presentation:

- use one quiet text line or hairline status row;
- labels: `Delivery`, `Payment`, `Private Review`;
- remove numbered card treatment;
- completed state uses existing gold;
- current state uses existing black;
- upcoming state uses existing muted text;
- do not add decorative dots, badges, pills, or animation.

Progress remains available to assistive technology through the existing semantic status.

### 7.3 Delivery

Section title:

`Where should we send your fragrance?`

Support line:

`These details are used only to arrange your delivery and order updates.`

Keep all current fields, order, names, autocomplete values, validation, and required status.

Perception refinements:

- reduce repeated uppercase system labels;
- group name fields without adding a card;
- let address breathe as the primary delivery field;
- use one divider after the section;
- show errors only through the current validation behavior;
- keep errors directly below the related control.

### 7.4 Payment

Section title:

`Choose how you would like to complete your order.`

Method supporting copy:

- Bank Transfer: `Receive the exact account and amount for your private order.`
- Easypaisa: `Receive the exact wallet and amount for your private order.`
- JazzCash: `Receive the exact wallet and amount for your private order.`

The selected state keeps the existing black, white, and gold treatment.

The payment-instruction reveal is positioned as a trust moment:

- Title: `Your Private Payment Details`
- Reassurance: `Use the exact amount below. Your selection remains reserved while you complete the transfer.`
- Fields: recipient, account or wallet, exact amount, and copy actions from the existing quote response.
- Quiet footer: `These details are shared only for this order.`

No payment data, quote logic, or API behavior changes.

### 7.5 Private proof handover

Section title:

`Send Your Private Confirmation`

Support line:

`Your proof is reviewed manually by the Dotfumes house and is not shown publicly.`

Control label:

`Add Payment Confirmation`

Technical constraints remain visible but secondary:

`JPG, PNG, WEBP, or PDF. Maximum 5 MB.`

Selected state:

- Heading: `Confirmation Ready`
- File name and size;
- existing preview behavior;
- quiet `Choose Another File` or `Remove` action;
- one short reassurance: `Ready for private review.`

The underlying file input, local preview behavior, validation, and submission behavior remain unchanged.

### 7.6 Trust

Replace 2 bordered information cards and the numbered operational list with one restrained trust block.

Suggested content:

- `Reserved Selection`: `Your fragrance stays attached to this private order.`
- `Manual House Review`: `A Dotfumes team member verifies each confirmation.`
- `Order ID Tracking`: `Your request is handled against its unique order ID.`

Use only claims already supported by the current system.

Do not use generic shield badges, bank-security claims, or unverified delivery promises.

### 7.7 Product presence

Rename the summary:

`Reserved for You`

Each product line shows:

- existing product image;
- fragrance name;
- one scent cue, maximum 1 line;
- quantity;
- price;
- microcopy: `Held for your private order`;
- current availability behavior when relevant.

De-emphasize:

- SKU;
- stock mechanics;
- administrative labels.

Desktop:

- keep the summary sticky;
- align its top with the compact opening;
- reduce shadow prominence;
- preserve current column width.

Mobile:

- place a compact expandable summary directly after the opening;
- keep image, fragrance name, scent cue, and total visible when collapsed;
- keep the product within one interaction throughout checkout;
- preserve the current cart data and quantity actions.

## 8. CTA Psychology

The CTA uses the existing state and actions. Only the visible label, supporting guidance, and presentation change.

| Existing logical moment | Concierge label | Supporting guidance |
| --- | --- | --- |
| Initial delivery | `Reserve Your Selection` | `Start with the delivery details for this private order.` |
| Partial delivery | `Continue Your Private Order` | `We will guide you to the next detail.` |
| Payment method needed | `Choose Payment Method` | `Select how you would like to complete the order.` |
| Method selected, instructions available | `View Your Payment Details` | `Receive the exact details for this order.` |
| Proof needed | `Add Private Confirmation` | `Send the confirmation for manual house review.` |
| Ready to submit | `Send for Private Review - {TOTAL}` | `Your order will be handled against its unique ID.` |
| Request active | `Sending to the House…` | `Keep this page open while the request is sent.` |

Rules:

- label stays on one line at desktop;
- CTA remains visually actionable except during the existing active request;
- no grey dead-end presentation;
- the action explains what happens next;
- supporting copy never claims an action already happened;
- current focus and validation behavior remains unchanged;
- do not introduce a new state or transition.

## 9. Motion

Motion communicates existing state changes only.

Use:

- `180-260 ms` opacity and small vertical transform for payment instructions;
- a quiet selected-state transition for payment method;
- a short confirmation reveal after proof selection;
- current loading feedback during submission.

Do not use:

- looping motion;
- parallax;
- scroll choreography;
- progress animation;
- decorative shimmer;
- layout movement that shifts the form while typing.

All motion must honor reduced-motion preference and use existing motion tokens.

## 10. Accessibility and Web Interface Requirements

- Submit guidance stays available until the existing request-active state.
- Labels remain associated with controls.
- Errors remain inline and the first relevant field receives focus.
- Payment methods remain one radio group with a shared legend.
- Payment instructions and proof status use a polite live region.
- All icon-only controls keep accessible names.
- Decorative icons are hidden from assistive technology.
- File constraints use `5 MB`, not `5MB`.
- Loading labels use the ellipsis character.
- Headings use balanced wrapping.
- Focus indicators use the existing gold focus token.
- Mobile targets remain at least 44 px.
- Motion respects reduced-motion preference.
- Product names, filenames, and totals wrap without horizontal overflow.

## 11. Component-Level Impact

| File or component | Planned perception change | Logic impact | Risk |
| --- | --- | --- | --- |
| `src/pages/CheckoutPage.tsx` | Compact opening, quiet progress, section hierarchy, trust block, summary placement, CTA copy | None | Medium |
| `CheckoutSummary` inside checkout | Reserved language, scent cue, mobile expansion, calmer hierarchy | None | Medium |
| Payment method presentation | Trust-oriented notes and selected styling refinement | None | Low |
| Payment instruction presentation | Private-detail framing and exact-amount hierarchy | None | Low |
| Proof presentation | Private-confirmation framing and technical-copy de-emphasis | None | Low |
| `src/contracts/checkout.contract.ts` | Customer-facing copy only if this remains the copy source | None | Low |
| Existing UI primitives | Reuse only; no token or variant additions unless implementation proves unavoidable | None | Low |
| Backend, API, stores, pricing | No changes | None | Prohibited |

## 12. Verification Plan

### Visual states

- empty selection;
- selected fragrance;
- untouched delivery;
- partial delivery;
- invalid delivery;
- each payment method;
- payment instructions visible;
- proof idle;
- proof selected;
- ready to submit;
- request active;
- error;
- mobile collapsed summary;
- mobile expanded summary.

### Behavior invariants

- same CTA actions;
- same state transitions;
- same validation results;
- same quote requests;
- same payload;
- same submission and retry behavior;
- same order ID and pricing behavior;
- same file validation;
- same backend results.

### Design QA

Design QA begins only after:

1. a single approved Superdesign visual target exists;
2. the implementation is rendered at the same viewport and state.

The source and implementation must be placed in one comparison input. All P0, P1, and P2 findings must be fixed and re-captured. The project-root `design-qa.md` must end with exactly:

`final result: passed`

before handoff.

## 13. Risks

### Medium

- Reordering the mobile summary could accidentally alter keyboard order.
- More conversational CTA labels could wrap at narrow widths.
- Scent copy could increase line height and summary height.
- Reducing progress chrome could make current state too subtle.

### Low

- Copy changes could become overly poetic.
- Trust claims could drift beyond verified behavior.
- A softer proof section could hide file requirements.

### Mitigations

- Keep DOM order aligned with visual order.
- Test labels at 320 px and desktop.
- Clamp scent cue to 1 line on desktop and 2 lines on mobile.
- Keep semantic progress and visible current-state contrast.
- Use plain, specific copy.
- Keep technical file constraints present but secondary.
- Confirm every trust statement against existing behavior.

## 14. Acceptance Criteria

The perception redesign is ready when:

- the product is visible or one expansion away throughout checkout;
- the opening frames a reservation, not a form;
- progress no longer dominates the page;
- payment selection leads into a calm, exact trust moment;
- proof feels like private confirmation handover;
- the CTA always communicates a useful next action;
- no supporting copy claims an event before it happens;
- no backend, API, store, pricing, validation, or state-machine behavior changes;
- no new design tokens or visual language are introduced;
- desktop and mobile have no horizontal overflow;
- reduced motion and keyboard flow remain correct;
- design QA has passed against the approved visual target.

## 15. Success Measure

Target customer perception:

> My fragrance is being held, my payment details are clear, and a real Dotfumes team member will handle this order privately.

Target internal score after implementation:

- Luxury concierge perception: `9/10`
- Trust clarity: `9/10`
- Product emotional continuity: `9/10`
- System-friction visibility: `2/10` or lower
