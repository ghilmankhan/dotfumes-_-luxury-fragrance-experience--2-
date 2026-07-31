# Luxury Commerce System Design

**Date:** 2026-07-30  
**Scope:** Product detail, cart, checkout, order submission, and order confirmation only.

## Goal

Turn the existing Dotfumes purchase path into a continuous luxury commerce experience while keeping backend complexity private and preserving the current React, Zustand, Google Sheets, Drive, and Apps Script architecture.

## Selected Approach

Use an additive, backward-compatible commerce contract:

- Google Sheets remains the source of truth for products, campaigns, coupons, inventory, and published reviews.
- Apps Script computes authoritative prices for quotes and final orders.
- The frontend renders server-provided prices and uses a pure pricing projection only for local fallback display.
- Cart state continues to contain items only. Checkout state remains local to checkout. Payment proof files and preview URLs remain local-only.
- Customer-visible order storage omits Drive URLs, Drive file IDs, backend status fields, logs, and notification payloads.
- Existing design tokens, routes, primitives, and luxury visual language remain unchanged.

This approach is preferred over a frontend-only pricing layer because prices must be authoritative, and over a new backend service because Dotfumes intentionally uses a low-cost Apps Script MVP.

## Commerce Data Model

### Product pricing

Each product supports:

- `basePrice`: the regular authoritative product price.
- `salePrice`: an optional explicit sale price.
- `isOnSale`: whether campaign pricing is active.
- `campaignLabel`: optional customer-facing campaign name.
- `discountValue`: campaign discount amount.
- `discountType`: `percent` or `fixed`.
- `finalPrice`: computed server-side from the valid sale/campaign state.
- `discountPercent`: computed for display.

Pricing precedence:

1. Start with `basePrice`.
2. If `isOnSale` is false, `finalPrice` equals `basePrice`.
3. If a valid `salePrice` is lower than `basePrice`, use it.
4. Otherwise apply the valid campaign discount to `basePrice`.
5. Clamp the result to the range `0..basePrice` and round to two decimals.
6. Apply a validated coupon to the order subtotal after product campaign discounts.
7. The final total equals discounted subtotal minus coupon discount plus delivery.

The legacy Sheets `Price` column remains supported as a fallback for `Base Price`, so existing deployments do not fail during migration.

### Campaign fields in the Products sheet

The Products sheet adds optional columns:

- `Base Price`
- `Sale Price`
- `Is On Sale`
- `Campaign Label`
- `Discount Value`
- `Discount Type`

Existing required product fields remain valid. Missing campaign columns resolve to a non-sale product.

### Coupons

An optional `Coupons` sheet supports:

- `Code`
- `Discount Type`
- `Discount Value`
- `Active`
- `Starts At`
- `Ends At`
- `Minimum Subtotal`
- `Campaign Label`

Coupon codes are normalized server-side, evaluated against the post-campaign subtotal, and never trusted from frontend totals. Invalid, expired, or ineligible coupons return a calm customer-facing reason and do not mutate the cart.

### Reviews

An optional `Reviews` sheet supports:

- `Review ID`
- `Product ID`
- `Customer Name`
- `Rating`
- `Title`
- `Impression`
- `Review`
- `Verified Purchase`
- `Published`
- `Created At`

Only published reviews are returned publicly. Product responses include aggregate rating and review count. The product page initially renders up to three reviews and expands the remaining reviews on request. No fabricated local customer reviews are shown when Sheets has no published reviews.

## Backend Contract

### Catalog response

`GET action=products` continues returning products and settings, with optional structured pricing and review summary fields. Existing frontend consumers can still read `price`, which aliases the authoritative `finalPrice`.

### Reviews response

`GET action=reviews&productId=<id>` returns only published, sanitized reviews for the matched product. It exposes no customer email, phone, sheet row, or internal moderation field.

### Quote response

`POST action=quote` accepts only product identifiers, quantities, and an optional coupon code. Apps Script resolves current products, validates availability, calculates campaign pricing, validates the coupon, and returns a customer-safe invoice:

- line items with product name, quantity, base unit price, final unit price, line discount, and line total
- base subtotal
- campaign discount
- coupon discount
- delivery fee
- final total
- currency
- optional customer-facing campaign and coupon labels

### Order response

Order submission continues accepting the existing payload for compatibility, but Apps Script ignores client-supplied prices, totals, payment status, and order status. It recomputes the invoice from Sheets, forces initial statuses, stores the private proof reference internally, and returns:

- success
- customer order reference
- customer-safe invoice
- received payment method
- sanitized customer/delivery/billing details

It does not return the Drive URL, Drive file ID, owner notification URL, logs, or admin fields.

### Payment proof privacy

Uploaded proof files remain accessible only to the Drive owner by default. Apps Script no longer enables `ANYONE_WITH_LINK`. Owner email can include the private Drive URL because it is an internal notification. Customer confirmation and frontend responses never include it.

### Duplicate protection

The existing order reference becomes the idempotency key. Before uploading a proof or decrementing inventory, Apps Script checks the Orders sheet for the same order reference. A repeated submission returns the already-created customer-safe order result and does not upload, append, notify, or decrement stock again.

## Frontend Architecture

### Pricing utilities

A focused `src/lib/pricing.ts` module owns safe number parsing, campaign price projection, savings display, invoice aggregation, and local fallback pricing. Components do not calculate prices inline.

### Product catalog

`Product` gains a structured `pricing` object, optional `campaign`, and `reviewSummary`. The legacy `price` field remains as the final display price for backward compatibility while all new UI reads structured pricing helpers.

### Reviews

`src/components/product/ProductReviews.tsx` owns the luxury review presentation:

- compact star summary with numeric rating and count
- three published preview reviews
- progressive expansion
- verified purchase marker
- short scent impression before the longer review
- honest empty and unavailable states

The presentation uses current serif/sans typography, borders, spacing tokens, and reduced-motion behavior. It avoids marketplace-style cards, voting controls, avatars, and dense metadata.

### Product CTA hierarchy

Desktop and mobile both use:

- Primary: `Buy Now` with the final price.
- Secondary: `Add to Selection`.

The buttons never share equal visual weight. Buy Now retains the fast route to checkout. Add to Selection opens the cart for review. Sale price, original price, savings, and campaign label appear once in the purchase block without loud banners.

### Cart

The cart becomes a compact reservation summary:

- each item shows final unit price and an understated original price when discounted
- subtotal, campaign savings, coupon savings, and total are presented in invoice order
- the only conversion action is `Continue Your Private Order`
- unavailable items remain actionable and accessible without adding an admin tone

Coupon entry is available in checkout, not duplicated in the cart drawer.

### Checkout structure

The existing guided CTA and semantic progress remain. The information architecture becomes:

1. Contact information: WhatsApp number and email.
2. Delivery address.
3. Billing address: `Same as delivery` is selected by default; separate billing fields progressively reveal only when needed.
4. Payment method and private payment confirmation.
5. Sticky order invoice with base subtotal, campaign savings, coupon discount, delivery, and final total.

Coupon application calls the quote endpoint. A quote refresh also occurs before submission. The CTA remains conversational and actionable; validation moves focus to the next missing field.

### Customer-safe order model

Session storage contains a `CustomerOrderReceipt`, not the internal `OrderPayload`. It includes the order reference, invoice, payment method, contact, delivery, billing, and received timestamp. It excludes slip URLs, Drive IDs, backend status fields, internal WhatsApp messages, and admin metadata.

### Confirmation

The confirmation page provides calm closure:

- `Your order has been received safely.`
- `We will personally review and confirm it.`
- `You will be updated shortly via WhatsApp or email.`

The page contains one structured invoice block with the customer order reference, products, quantities, pricing breakdown, payment method, contact, delivery, and billing. It offers only:

- `Continue Shopping`
- `Track Order / Contact Support`

No proof preview, proof file name, Drive link, copy action, email-send action, WhatsApp-send action, fallback mode, backend status, or technical messaging is shown.

## Error Handling

- Catalog failure uses the local product catalog and no campaign or review claims.
- Reviews failure shows a quiet unavailable message without affecting purchase controls.
- Quote failure keeps the current valid local estimate, marks it as pending final confirmation, and retries at submission.
- Invalid coupons stay in the checkout context with a specific, non-technical message.
- Order failure remains on checkout with the form, cart, coupon, and local proof selection intact.
- Duplicate order submission resolves to the existing customer receipt instead of creating another order.
- Proof upload errors never expose storage details.

## Accessibility and Motion

- Reviews use semantic headings, list structure, and text equivalents for ratings.
- Original prices use readable text, not color alone, and savings copy supplies meaning.
- Billing disclosure uses a native checkbox with an explicit label.
- Coupon status uses `aria-live`.
- All purchase controls retain current focus rings and minimum target sizes.
- Motion is limited to existing opacity/position transitions and respects reduced motion.
- No scroll hijacking or decorative animation is added.

## Migration and Compatibility

- New Product, Coupon, Review, and Order columns are additive.
- `Price` remains accepted when `Base Price` is absent.
- Missing Coupons or Reviews sheets return empty public data rather than breaking catalog or orders.
- Existing stored carts are migrated to current catalog pricing during catalog hydration and before checkout.
- Existing order submissions remain parseable, but their client totals are ignored.
- Setup documentation includes exact sheet headers and privacy behavior.

## Test Strategy

### Unit and contract tests

- campaign price computation: no sale, explicit sale, percent, fixed, invalid, and rounding
- coupon computation: percent, fixed, expiry, minimum subtotal, clamp, and case normalization
- invoice aggregation and discount totals
- customer receipt sanitization
- catalog row normalization and legacy `Price` fallback
- billing same-as-delivery projection

### End-to-end tests

- product page shows dominant Buy Now and secondary Add to Selection
- sale price and campaign label render without competing banners
- published review summary, three previews, expansion, verified markers, and empty state
- Buy Now preserves the selected quantity and reaches checkout
- cart and checkout use the same final prices
- coupon success, invalid coupon, and quote timeout
- same-as-delivery default and separate billing validation
- proof upload and retry
- confirmation contains the structured invoice and only two actions
- confirmation never renders a Drive URL, slip filename, copy action, send action, backend status, or internal mode
- duplicate submission returns one order and one inventory decrement at the Apps Script contract level
- mobile purchase bar, checkout summary, and confirmation layout

### Visual QA

Capture the current product, cart, checkout, and confirmation states before UI changes. After implementation, capture the same viewports and states, create matched comparison boards, and inspect hierarchy, spacing, typography, overflow, focus, reduced motion, and mobile behavior.

## Out of Scope

- Payment gateway integration
- Customer accounts
- A public tracking dashboard
- New brand tokens, typography, colors, radius, or global layout
- Review submission or moderation UI
- Enterprise backend migration
- App-wide redesign
