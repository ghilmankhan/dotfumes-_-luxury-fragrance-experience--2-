# Luxury Commerce System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a continuous product-to-confirmation commerce system with authoritative campaign/coupon pricing, published reviews, structured billing and invoice data, private payment proof handling, and a calm two-action confirmation.

**Architecture:** Extend the existing Product and Order contracts without replacing React Router, Zustand, or Apps Script. Apps Script remains authoritative for catalog pricing, coupon validation, inventory, order totals, statuses, idempotency, and private proof storage; frontend utilities provide a deterministic fallback projection and render only customer-safe receipt data.

**Tech Stack:** React 19, TypeScript 5.8, Zustand 5, Vite 6, Tailwind CSS 4, Motion, Playwright, Node test runner through `tsx`, Google Apps Script, Google Sheets, Google Drive.

## Global Constraints

- Preserve the existing Dotfumes tokens, typography, routes, primitives, and premium visual identity.
- Do not expose Drive URLs, Drive file IDs, notification URLs, logs, admin status fields, or backend mode in customer UI or session storage.
- Do not trust client-supplied price, total, payment status, or order status.
- Do not fabricate customer reviews.
- Do not add payment gateways, customer accounts, a tracking dashboard, or unrelated app-wide redesign work.
- Keep Cart Store limited to items and drawer state; keep proof files and preview URLs local-only.
- Keep the Google Sheets + Apps Script MVP practical and backward-compatible with the legacy `Price` product column.
- Use red-green-refactor for every behavior change.
- Preserve all unrelated user-owned worktree changes.

---

### Task 1: Commerce Types and Deterministic Pricing

**Files:**
- Create: `src/models/commerce.ts`
- Create: `src/lib/pricing.ts`
- Create: `tests/unit/pricing.test.ts`
- Modify: `src/models/types.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `PricingSnapshot`, `Campaign`, `ReviewSummary`, `ProductReview`, `CommerceLine`, `CommerceInvoice`, and `CouponQuote`.
- Produces: `computeProductPricing(input)`, `buildLocalInvoice(items, coupon?)`, `getProductFinalPrice(product)`, and `getProductSavings(product)`.

- [ ] **Step 1: Add a failing unit test for sale and campaign precedence**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { computeProductPricing } from '../../src/lib/pricing';

test('uses the lower valid sale price before campaign math', () => {
  assert.deepEqual(
    computeProductPricing({
      basePrice: 220,
      salePrice: 180,
      isOnSale: true,
      discountType: 'percent',
      discountValue: 10,
    }),
    {
      basePrice: 220,
      finalPrice: 180,
      discountAmount: 40,
      discountPercent: 18,
      isDiscounted: true,
    },
  );
});
```

- [ ] **Step 2: Run the pricing test and confirm the missing module failure**

Run: `npx tsx --test tests/unit/pricing.test.ts`  
Expected: FAIL because `src/lib/pricing.ts` does not exist.

- [ ] **Step 3: Add focused commerce types and minimal pricing functions**

```ts
export type DiscountType = 'percent' | 'fixed';

export interface PricingInput {
  basePrice: number;
  salePrice?: number;
  isOnSale?: boolean;
  discountValue?: number;
  discountType?: DiscountType;
}

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
```

`computeProductPricing` must clamp malformed values, prefer a lower explicit sale price, otherwise apply the campaign discount, and always return two-decimal finite values.

- [ ] **Step 4: Extend tests for no sale, percent, fixed, invalid values, clamp, coupon, and invoice aggregation**

```ts
test('clamps a fixed campaign at zero', () => {
  assert.equal(
    computeProductPricing({
      basePrice: 50,
      isOnSale: true,
      discountType: 'fixed',
      discountValue: 100,
    }).finalPrice,
    0,
  );
});
```

- [ ] **Step 5: Add `npm run test:unit` and run the complete pricing suite**

Run: `npm run test:unit`  
Expected: all pricing tests pass with no warnings.

- [ ] **Step 6: Commit the commerce foundation**

```bash
git add package.json src/models/commerce.ts src/models/types.ts src/lib/pricing.ts tests/unit/pricing.test.ts
git commit -m "feat: add authoritative commerce pricing model"
```

---

### Task 2: Catalog Pricing, Reviews, and Quote Client

**Files:**
- Create: `src/lib/catalog.ts`
- Create: `tests/unit/catalog.test.ts`
- Modify: `src/lib/googleSheetsBackend.ts`
- Modify: `src/store/useProductCatalogStore.ts`
- Modify: `src/constants/products.ts`

**Interfaces:**
- Consumes: commerce types and pricing utilities from Task 1.
- Produces: `normalizeCatalogProduct(localProduct, sheetRow)`.
- Produces: `fetchProductReviews(productId)`.
- Produces: `requestCommerceQuote({ items, couponCode })`.
- Produces: catalog products whose legacy `price` equals `pricing.finalPrice`.

- [ ] **Step 1: Add failing catalog normalization tests**

```ts
test('keeps legacy Price compatibility and projects campaign fields', () => {
  const product = normalizeCatalogProduct(localProduct, {
    productId: 'DTF-BD-50ML',
    price: 220,
    basePrice: 220,
    salePrice: 187,
    isOnSale: true,
    campaignLabel: 'Summer Reserve',
  });

  assert.equal(product.price, 187);
  assert.equal(product.pricing.basePrice, 220);
  assert.equal(product.campaign?.label, 'Summer Reserve');
});
```

- [ ] **Step 2: Run the catalog test and confirm it fails because normalization is absent**

Run: `npx tsx --test tests/unit/catalog.test.ts`  
Expected: FAIL because `normalizeCatalogProduct` is not exported.

- [ ] **Step 3: Implement backward-compatible catalog normalization**

Map `basePrice`, `salePrice`, `isOnSale`, `campaignLabel`, `discountValue`, `discountType`, `ratingAverage`, and `reviewCount`. When the structured fields are absent, treat legacy `price` as `basePrice` and as the final price.

- [ ] **Step 4: Add customer-safe review and quote response parsers**

```ts
export const fetchProductReviews = async (productId: string): Promise<ProductReview[]> => {
  // GET action=reviews with encoded product ID; parse only public fields.
};

export const requestCommerceQuote = async (input: QuoteRequest): Promise<CommerceQuote> => {
  // POST a FormData payload with action=quote, item identifiers/quantities, and coupon code.
};
```

Reject malformed totals and reviews rather than rendering untrusted response shapes.

- [ ] **Step 5: Refresh persisted cart prices from hydrated catalog**

On successful catalog hydration, map existing cart item identity and quantity onto the latest matching catalog product so campaign changes cannot leave stale cart pricing.

- [ ] **Step 6: Run unit, lint, and TypeScript checks**

Run: `npm run test:unit && npm run lint`  
Expected: all tests and checks pass.

- [ ] **Step 7: Commit catalog commerce support**

```bash
git add src/lib/catalog.ts src/lib/googleSheetsBackend.ts src/store/useProductCatalogStore.ts src/constants/products.ts tests/unit/catalog.test.ts
git commit -m "feat: hydrate campaign pricing and published reviews"
```

---

### Task 3: Apps Script Authority, Coupons, Reviews, Privacy, and Idempotency

**Files:**
- Create: `tests/apps-script/commerce-backend.test.ts`
- Modify: `apps-script/dotfumes-order-webapp.gs`
- Modify: `docs/google-apps-script/order-backend.gs`

**Interfaces:**
- Consumes: Products, optional Coupons, optional Reviews, Orders, and Settings sheets.
- Produces: `GET action=products`, `GET action=reviews`, `POST action=quote`, and customer-safe `POST action=order` behavior.
- Produces: `calculateProductPrice_`, `buildAuthoritativeInvoice_`, `findCoupon_`, `findExistingOrder_`, and `toCustomerOrderResponse_`.

- [ ] **Step 1: Add a failing VM-backed Apps Script contract test**

Load the `.gs` source into `node:vm` with stubs for `Utilities`, `ContentService`, `DriveApp`, `SpreadsheetApp`, `LockService`, and `PropertiesService`.

```ts
test('authoritative invoice ignores client prices', () => {
  const invoice = context.buildAuthoritativeInvoice_(
    [{ productId: 'DTF-BD-50ML', quantity: 2, unitPrice: 1 }],
    [{ productId: 'DTF-BD-50ML', name: 'Bold Decision', basePrice: 220, finalPrice: 180 }],
    null,
    0,
  );
  assert.equal(invoice.total, 360);
});
```

- [ ] **Step 2: Run the Apps Script test and confirm the missing function failure**

Run: `npx tsx --test tests/apps-script/commerce-backend.test.ts`  
Expected: FAIL because `buildAuthoritativeInvoice_` does not exist.

- [ ] **Step 3: Add optional schema constants and resolvers**

Add optional product campaign columns, `COUPONS_COLUMNS_REQUIRED`, `REVIEWS_COLUMNS_REQUIRED`, and `COUPONS_SHEET_NAME` / `REVIEWS_SHEET_NAME` property resolvers. Missing optional sheets must yield empty arrays without breaking orders.

- [ ] **Step 4: Implement authoritative pricing and quote behavior**

`readProducts_` and `readProductSheetState_` must return computed pricing. `doPost` must branch on `payload.action === 'quote'` before requiring slip data. Quote input contains only item identity, quantity, and coupon code.

- [ ] **Step 5: Make order submission authoritative**

Resolve incoming product identifiers against sheet rows, compute invoice values, force:

```js
const paymentStatus = 'Pending Verification';
const orderStatus = 'New';
```

Use invoice line items, subtotal, discount, delivery, and total for sheet storage and notifications. Ignore client price/status values.

- [ ] **Step 6: Add duplicate prevention before upload and stock decrement**

With the script lock held, search Orders by order reference. If present, return the stored customer-safe receipt without uploading another proof, appending a row, decrementing inventory, or sending notifications.

- [ ] **Step 7: Remove public Drive sharing and customer response leakage**

Delete the `file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)` call. Keep the private file URL only in the Orders sheet and owner notification. Remove `slipUrl`, `driveFileId`, and `whatsappUrl` from public order responses.

- [ ] **Step 8: Add published review endpoint**

Return only published review ID, customer display name, rating, title, impression, review text, verified flag, and created date. Aggregate review count and average into the product response.

- [ ] **Step 9: Run backend contract tests and compare both Apps Script copies**

Run: `npm run test:unit && cmp apps-script/dotfumes-order-webapp.gs docs/google-apps-script/order-backend.gs`  
Expected: tests pass and `cmp` exits 0.

- [ ] **Step 10: Commit backend commerce integrity**

```bash
git add apps-script/dotfumes-order-webapp.gs docs/google-apps-script/order-backend.gs tests/apps-script/commerce-backend.test.ts
git commit -m "feat: make Apps Script commerce authoritative"
```

---

### Task 4: Product Reviews, Pricing, and CTA Hierarchy

**Files:**
- Create: `src/components/product/ProductReviews.tsx`
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/components/home/ProductCard.tsx`
- Modify: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: structured pricing, campaign, review summary, and `fetchProductReviews`.
- Produces: accessible product review section and one dominant `Buy Now` conversion path.

- [ ] **Step 1: Add failing product commerce end-to-end tests**

```ts
test('product purchase block prioritizes Buy Now and reveals published reviews', async ({ page }) => {
  await page.goto('/product/bold-decision');
  await expect(page.getByRole('button', { name: /Buy Now/i })).toHaveAttribute('data-priority', 'primary');
  await expect(page.getByText(/verified purchase/i).first()).toBeVisible();
  await page.getByRole('button', { name: /Read all reviews/i }).click();
  await expect(page.getByRole('region', { name: /customer impressions/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the targeted test and confirm missing review/priority behavior**

Run: `npm run test:e2e -- --grep "product purchase block"`  
Expected: FAIL on missing CTA priority or review section.

- [ ] **Step 3: Build the minimal luxury review component**

Use semantic stars from Lucide `Star`, a numeric rating label, three previews, `Verified purchase`, scent impression, and a disclosure button. Do not add avatars, voting, marketplace filters, or review submission controls.

- [ ] **Step 4: Refactor purchase price and CTAs**

Render campaign label, original price, final price, and subtle savings once. Desktop and mobile must use primary `Buy Now — $TOTAL` and secondary `Add to Selection`. Update Product JSON-LD offer price and aggregate rating only when real review data exists.

- [ ] **Step 5: Run product tests at desktop and mobile widths**

Run: `npm run test:e2e -- --grep "product"`  
Expected: product route, quantity, CTA, pricing, and review tests pass.

- [ ] **Step 6: Commit product conversion intelligence**

```bash
git add src/components/product/ProductReviews.tsx src/pages/ProductPage.tsx src/components/home/ProductCard.tsx tests/e2e/smoke.spec.ts
git commit -m "feat: add luxury product reviews and CTA hierarchy"
```

---

### Task 5: Cart and Checkout Invoice, Billing, and Coupons

**Files:**
- Create: `src/components/commerce/OrderInvoice.tsx`
- Create: `src/components/checkout/CouponField.tsx`
- Modify: `src/models/order.ts`
- Modify: `src/contracts/checkout.contract.ts`
- Modify: `src/hooks/useCheckoutValidation.ts`
- Modify: `src/components/cart/CartLineItem.tsx`
- Modify: `src/components/CartDrawer.tsx`
- Modify: `src/pages/CheckoutPage.tsx`
- Modify: `src/services/orderSubmissionService.ts`
- Modify: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `CommerceInvoice`, quote client, structured product prices, existing checkout guidance, and existing payment proof control.
- Produces: `billingSameAsDelivery`, `billingAddress`, `billingCity`, and `couponCode` checkout values.
- Produces: a reusable `OrderInvoice` for checkout and confirmation.

- [ ] **Step 1: Add failing billing and invoice end-to-end tests**

```ts
test('checkout defaults billing to delivery and shows a complete invoice', async ({ page }) => {
  await addBoldDecisionToCheckout(page);
  await expect(page.getByRole('checkbox', { name: /billing address is the same/i })).toBeChecked();
  await expect(page.getByText('Subtotal')).toBeVisible();
  await expect(page.getByText('Campaign savings')).toBeVisible();
  await expect(page.getByText('Final total')).toBeVisible();
});
```

- [ ] **Step 2: Run the targeted checkout test and confirm missing billing/invoice behavior**

Run: `npm run test:e2e -- --grep "billing|complete invoice"`  
Expected: FAIL because billing disclosure and invoice rows do not exist.

- [ ] **Step 3: Extend checkout values and validation**

Default `billingSameAsDelivery` to `true`. Require billing address and city only when the checkbox is false. Relabel phone as `WhatsApp number` and group it with email under `Contact information`.

- [ ] **Step 4: Build the shared invoice component**

Render line items, base subtotal, campaign savings, coupon discount when greater than zero, delivery, and final total. Use current borders, typography tokens, and formatters. Never render SKU, storage references, or backend status.

- [ ] **Step 5: Add coupon quote behavior**

The coupon field applies on explicit user action, preserves the entered code, announces success/error through `aria-live`, and updates the invoice only from a valid quote response. Submission refreshes the quote before calling the order service.

- [ ] **Step 6: Update cart and checkout CTA language**

Cart primary action becomes `Continue Your Private Order`. Checkout keeps the existing guidance sequence and final `Send for Private Review — $TOTAL`; no extra send, email, WhatsApp, or copy actions are added.

- [ ] **Step 7: Run checkout and cart tests**

Run: `npm run test:e2e -- --grep "cart|checkout|coupon|billing|invoice"`  
Expected: all matching tests pass at configured desktop and mobile projects.

- [ ] **Step 8: Commit cart and checkout commerce flow**

```bash
git add src/components/commerce/OrderInvoice.tsx src/components/checkout/CouponField.tsx src/models/order.ts src/contracts/checkout.contract.ts src/hooks/useCheckoutValidation.ts src/components/cart/CartLineItem.tsx src/components/CartDrawer.tsx src/pages/CheckoutPage.tsx src/services/orderSubmissionService.ts tests/e2e/smoke.spec.ts
git commit -m "feat: guide checkout with billing and live invoice"
```

---

### Task 6: Customer-Safe Receipt and Confirmation Closure

**Files:**
- Create: `src/models/customerReceipt.ts`
- Create: `src/lib/customerReceipt.ts`
- Create: `tests/unit/customerReceipt.test.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/services/orderSubmissionService.ts`
- Modify: `src/pages/OrderConfirmationPage.tsx`
- Modify: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: authoritative order response and shared `OrderInvoice`.
- Produces: `CustomerOrderReceipt` and `toCustomerOrderReceipt(order)`.
- Produces: session storage that cannot contain proof URLs, Drive IDs, notification payloads, backend mode, payment status, or order status.

- [ ] **Step 1: Add a failing receipt sanitization unit test**

```ts
test('customer receipt excludes backend and proof metadata', () => {
  const receipt = toCustomerOrderReceipt(internalOrder);
  const serialized = JSON.stringify(receipt);
  assert.doesNotMatch(serialized, /drive|slipUrl|referenceUrl|submissionMode|whatsappMessage/i);
});
```

- [ ] **Step 2: Run the receipt test and confirm the missing mapper failure**

Run: `npx tsx --test tests/unit/customerReceipt.test.ts`  
Expected: FAIL because the receipt mapper does not exist.

- [ ] **Step 3: Implement the allow-listed customer receipt mapper**

Construct the receipt field-by-field: order reference, received timestamp, payment method label/value, invoice, customer name, WhatsApp number, email, delivery address, and billing address. Do not spread the internal order object.

- [ ] **Step 4: Replace confirmation UI with emotional closure and one invoice**

Render:

- `Your order has been received safely.`
- `We will personally review and confirm it.`
- `You will be updated shortly via WhatsApp or email.`
- one customer reference line
- one invoice
- contact, delivery, billing, and payment sections
- `Continue Shopping`
- `Track Order / Contact Support`

Remove proof preview, file name, Drive link, backend fallback banner, copy action, send-by-email action, send-on-WhatsApp action, and status jargon.

- [ ] **Step 5: Add a negative-leak end-to-end assertion**

```ts
await expect(page.getByText(/drive\\.google|referenceUrl|stored locally|copy order|send order/i)).toHaveCount(0);
await expect(page.getByRole('link')).toHaveCount(2);
```

- [ ] **Step 6: Run receipt and confirmation tests**

Run: `npm run test:unit && npm run test:e2e -- --grep "order-confirmation"`  
Expected: all receipt and confirmation tests pass.

- [ ] **Step 7: Commit private confirmation**

```bash
git add src/models/customerReceipt.ts src/lib/customerReceipt.ts src/lib/storage.ts src/services/orderSubmissionService.ts src/pages/OrderConfirmationPage.tsx tests/unit/customerReceipt.test.ts tests/e2e/smoke.spec.ts
git commit -m "feat: close orders with a private customer receipt"
```

---

### Task 7: Sheets Migration and Operational Documentation

**Files:**
- Modify: `docs/GOOGLE_SHEETS_BACKEND_SETUP.md`
- Modify: `docs/PRODUCTION_ORDER_FLOW.md`
- Modify: `docs/QA_CHECKLIST.md`

**Interfaces:**
- Documents exact Products, Coupons, Reviews, and Orders headers.
- Documents private Drive behavior, deployment steps, quote/review checks, and rollback.

- [ ] **Step 1: Update exact sheet headers and compatibility rules**

Document legacy `Price` support, new campaign columns, optional Coupons and Reviews tabs, and additive invoice/billing order columns.

- [ ] **Step 2: Replace public proof verification instructions**

State that payment proof links are owner-only, available in the Orders sheet and owner email, and absent from customer responses and confirmation UI.

- [ ] **Step 3: Add operational verification**

Include checks for campaign price publication, expired coupon rejection, unpublished review exclusion, duplicate order idempotency, private proof access, and confirmation receipt sanitation.

- [ ] **Step 4: Run documentation secret and leakage scan**

Run:

```bash
rg -n "script\\.google\\.com/macros/s/[A-Za-z0-9_-]+|VITE_ADMIN_PASSWORD=.+|ANYONE_WITH_LINK|Slip URL is a real Google Drive URL" docs
```

Expected: no real endpoint/token/password matches and no obsolete public-proof instruction.

- [ ] **Step 5: Commit operational guidance**

```bash
git add docs/GOOGLE_SHEETS_BACKEND_SETUP.md docs/PRODUCTION_ORDER_FLOW.md docs/QA_CHECKLIST.md
git commit -m "docs: operate private campaign commerce flow"
```

---

### Task 8: Full Verification and Matched Visual QA

**Files:**
- Modify: `design-qa.md`
- Add only generated QA evidence under: `.tmp/luxury-commerce-qa-2026-07-30/`

**Interfaces:**
- Consumes: finished product, cart, checkout, and confirmation flow.
- Produces: automated evidence, matched before/after screenshots, and final QA status.

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npm run test:unit
npm run test:e2e
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 2: Start the local app with live backend variables intentionally blank**

Run:

```bash
env VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL= VITE_GOOGLE_APPS_SCRIPT_URL= node node_modules/vite/bin/vite.js --port=3000 --host=127.0.0.1
```

Expected: Vite serves product, cart, checkout, and confirmation routes without contacting production services.

- [ ] **Step 3: Capture matched desktop and mobile states**

Capture:

- product default and reviews expanded
- cart drawer
- checkout delivery, payment, coupon, and proof-ready states
- confirmation receipt
- 1440px desktop and 390px mobile

Use the in-app browser only. Keep current and previous screenshots at identical viewports.

- [ ] **Step 4: Build comparison boards and inspect**

Place before and after states side by side. Check CTA dominance, price continuity, review density, invoice hierarchy, billing disclosure, proof privacy, action count, overflow, crop, focus, and reduced motion.

- [ ] **Step 5: Fix only observed defects and rerun affected checks**

Every correction must have a targeted failing test or a documented visual mismatch before code changes. Re-run the relevant unit/e2e test and regenerate the affected comparison board.

- [ ] **Step 6: Record final QA**

Update `design-qa.md` with:

- viewports and states tested
- observed defects and resolutions
- accessibility checks
- backend privacy checks
- exact command results
- final line `final result: passed`

- [ ] **Step 7: Commit verification artifacts that belong in source**

```bash
git add design-qa.md tests
git commit -m "test: verify luxury commerce continuity"
```

