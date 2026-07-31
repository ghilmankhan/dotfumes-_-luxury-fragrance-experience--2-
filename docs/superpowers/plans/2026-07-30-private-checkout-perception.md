# Private Checkout Perception Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing checkout presentation into a restrained private-fragrance reservation ritual without changing backend, API, pricing, validation, store, or submission architecture.

**Architecture:** Keep the current `CheckoutPage.tsx` composition, validation hook, submission service, stores, and checkout contract. Derive progress and CTA presentation from state already returned by `useCheckoutValidation`, reorder existing grid children for mobile product continuity, and limit `CartLineItem` changes to its existing `checkout` render branch. Use the Superdesign Quiet Reservation draft as a composition reference, with the explicit fidelity corrections documented below.

**Tech Stack:** React 19, TypeScript 5.8, React Router 6, Zustand 5 read-only selectors, Tailwind CSS 4, Motion 12, Playwright 1.60, Vite 6.

## Global Constraints

- Preserve `INTENT -> DELIVERY -> PAYMENT -> PROOF -> CONFIRMATION`.
- Do not modify `apps-script/**`.
- Do not modify `src/lib/googleSheetsBackend.ts`.
- Do not modify `src/services/orderSubmissionService.ts`.
- Do not change pricing, quote, idempotency, inventory, payment-status, or order-status behavior.
- Do not change Zustand store state shapes or persistence.
- Do not change backend payload types or API contracts.
- Do not change field names, order, required status, autocomplete values, validation rules, or submission payload.
- Do not add tokens, colors, fonts, gradients, radii, shadows, icon families, badges, pills, or a dark checkout section.
- Keep all three existing payment methods: Bank Transfer, Easypaisa, and JazzCash.
- Keep the existing boxed `Input` primitive; the Superdesign draft's underline-only inputs are not authoritative.
- Do not copy the Superdesign `Manual review` badge.
- Do not render invented recipient, bank, account, wallet, or quote data.
- Do not claim proof is non-public. The current Apps Script makes the Drive file link-accessible and returns its URL/ID; changing that is prohibited by this scope.
- Honest supported trust language may state manual review, selection continuity, and a unique order reference only.
- Primary checkout guidance remains enabled until the existing request-active state; submission still passes through the existing `submitOrder`, `validateAll`, and `scrollToFirstError` behavior.
- Every motion change uses existing motion tokens, transform/opacity only, and honors reduced motion.

---

## File Map

### Modified

- `src/contracts/checkout.contract.ts`
  - Owns approved checkout-facing copy while preserving field and validation contracts.
- `src/pages/CheckoutPage.tsx`
  - Owns the compact opening, quiet progress, section hierarchy, mobile summary placement, trust block, proof framing, and derived CTA presentation.
- `src/components/cart/CartLineItem.tsx`
  - Adds scent and reservation language only to the existing checkout variant.
- `tests/e2e/smoke.spec.ts`
  - Verifies the emotional hierarchy, responsive product continuity, actionable guidance, three payment methods, honest trust language, accessibility, and unchanged successful submission.
- `design-qa.md`
  - Records the final same-viewport source/implementation visual comparison and blocking QA result.

### Not modified

- `src/hooks/useCheckoutValidation.ts`
- `src/store/useCartStore.ts`
- `src/store/useProductCatalogStore.ts`
- `src/models/order.ts`
- `src/models/types.ts`
- `src/lib/googleSheetsBackend.ts`
- `src/services/orderSubmissionService.ts`
- `apps-script/**`
- shared primitive styling and global design tokens

## Visual Source Decision

Superdesign project:

- Canvas: `https://superdesign.dev/teams/f8350d13-6358-4512-85e9-e980328fb56a/projects/22e0c889-f5dd-4680-9bc8-da28eccfb56a`
- Current-source draft: `3c4b75ff-aa1b-4b68-9903-60e1d9f31d58`
- Quiet Reservation branch: `c3ef4e62-be9e-4dfd-93af-090bae34c265`

Use the Quiet Reservation branch for:

- compact opening scale;
- quiet hairline progress;
- section spacing rhythm;
- sticky `Reserved for You` summary;
- scent and reservation continuity;
- payment-to-proof trust sequence;
- one restrained trust block;
- active black CTA treatment.

Correct these generated-draft deviations during implementation:

1. Use the current boxed `Input` primitive, not underline-only fields.
2. Render all three existing payment methods, not two.
3. Remove the generated `Manual review` badge.
4. Never render the generated sample bank/account values.
5. Use real product assets and data, never the draft's stock perfume image or invented fragrance.
6. Keep payment copy truthful until an authorized account/quote source exists.

---

### Task 1: Lock the UX Contract With Failing End-to-End Tests

**Files:**

- Modify: `tests/e2e/smoke.spec.ts:490-704`

**Interfaces:**

- Consumes: current route helpers, `checkoutContract`, browser-local cart persistence, existing validation, and existing submission stubs.
- Produces: executable acceptance coverage for the redesigned checkout without changing implementation.

- [ ] **Step 1: Replace obsolete copy and disabled-state assertions**

Update the Buy Now assertion:

```ts
await expect(page.getByRole('heading', { name: 'Reserved for You' })).toBeVisible();
```

Replace the old disabled-submit setup in `checkout shows validation errors when required fields are missing` with:

```ts
const guidanceButton = page.getByRole('button', { name: 'Reserve Your Selection' });
await expect(guidanceButton).toBeEnabled();
await guidanceButton.click();
await expect(page.getByText(checkoutFields.firstName.messages.required)).toBeVisible();
await expect(page.getByLabel(checkoutFields.firstName.label)).toBeFocused();
```

Keep the existing payment-method and slip blur assertions after this block so inline validation remains covered.

- [ ] **Step 2: Add a CTA guidance-state test**

Add this test immediately after the missing-fields test:

```ts
test('checkout guidance remains actionable and names the next useful step', async ({ page }) => {
  await page.goto('/product/bold-decision');
  await page.getByRole('button', { name: /Add to Cart/i }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  const firstName = page.getByLabel(checkoutFields.firstName.label);
  await expect(page.getByRole('button', { name: 'Reserve Your Selection' })).toBeEnabled();

  await firstName.fill('Amina');
  await expect(page.getByRole('button', { name: 'Continue Your Private Order' })).toBeEnabled();

  for (const fieldName of checkoutContract.steps[0].fields) {
    const field = checkoutFields[fieldName];
    await page.getByLabel(field.label).fill(checkoutContract.testFixtures.validValues[fieldName]);
  }

  await expect(page.getByRole('button', { name: 'Choose Payment Method' })).toBeEnabled();

  const paymentMethod = checkoutContract.paymentMethods[0];
  await page.getByText(paymentMethod.label, { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add Private Confirmation' })).toBeEnabled();

  await page.locator(`input[name="${checkoutContract.slip.name}"]`).setInputFiles({
    name: checkoutContract.testFixtures.validSlip.name,
    mimeType: checkoutContract.testFixtures.validSlip.type,
    buffer: Buffer.from(checkoutContract.testFixtures.validSlip.contents),
  });

  await expect(page.getByRole('button', { name: /^Send for Private Review - / })).toBeEnabled();
});
```

- [ ] **Step 3: Replace the old progress/reassurance test**

Use semantic customer-facing assertions:

```ts
test('checkout frames the order as a reservation with honest trust language', async ({ page }) => {
  await page.goto('/checkout');

  await expect(page.getByText('Private Order', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your selection, reserved.' })).toBeVisible();

  const progress = page.getByLabel(checkoutContract.progressLabel);
  for (const label of ['Delivery', 'Payment', 'Private Review']) {
    await expect(progress.getByText(label, { exact: true })).toBeVisible();
  }

  await expect(page.getByText('Manual House Review', { exact: true })).toBeVisible();
  await expect(page.getByText('Order Reference', { exact: true })).toBeVisible();
  await expect(page.getByText(/not shown publicly/i)).toHaveCount(0);
  await expect(page.getByText(/secure payment/i)).toHaveCount(0);
});
```

- [ ] **Step 4: Add three-method and selected-state coverage**

```ts
test('checkout preserves all three payment choices and their selected state', async ({ page }) => {
  await page.goto('/checkout');

  for (const paymentMethod of checkoutContract.paymentMethods) {
    await expect(page.getByText(paymentMethod.label, { exact: true })).toBeVisible();
  }

  const easypaisa = checkoutContract.paymentMethods.find((method) => method.value === 'easypaisa');
  expect(easypaisa).toBeDefined();

  await page.getByText(easypaisa!.label, { exact: true }).click();
  await expect(
    page.locator(`input[name="${checkoutFields.paymentMethod.name}"][value="easypaisa"]`),
  ).toBeChecked();
  await expect(page.getByText(/wallet and amount for your private order/i)).toBeVisible();
});
```

- [ ] **Step 5: Replace the mobile order test and add overflow coverage**

```ts
test('mobile checkout keeps the reserved fragrance one interaction from the opening', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/product/soft-promise');
  await page
    .getByRole('button', { name: /^Buy Now$/i })
    .first()
    .click();

  const checkoutHeading = page.getByRole('heading', { name: 'Your selection, reserved.' });
  const summaryToggle = page.getByRole('button', { name: /Reserved for You/i });
  const deliveryHeading = page.getByRole('heading', {
    name: 'Where should we send your fragrance?',
  });

  const headingBox = await checkoutHeading.boundingBox();
  const summaryBox = await summaryToggle.boundingBox();
  const deliveryBox = await deliveryHeading.boundingBox();

  expect(headingBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(deliveryBox).not.toBeNull();
  expect((headingBox?.y ?? 0) < (summaryBox?.y ?? 0)).toBeTruthy();
  expect((summaryBox?.y ?? 0) < (deliveryBox?.y ?? 0)).toBeTruthy();

  await expect(summaryToggle).toHaveAttribute('aria-expanded', 'false');
  await summaryToggle.click();
  await expect(summaryToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Held for your private order', { exact: true })).toBeVisible();
});

test('checkout does not overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/checkout');

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));

  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
});
```

- [ ] **Step 6: Update the successful-submission test to the final CTA**

Replace the old `checkoutSubmission.label` locator with:

```ts
const submitButton = page.getByRole('button', { name: /^Send for Private Review - / });
await expect(submitButton).toBeEnabled();
await submitButton.click();
await expect(page).toHaveURL(/\/order-confirmation$/);
```

- [ ] **Step 7: Replace the unavailable-stock disabled assertion**

The CTA is no longer visually dead. Verify honest guidance and unchanged submission protection:

```ts
const reviewButton = page.getByRole('button', { name: 'Review Your Reserved Selection' });
await expect(reviewButton).toBeEnabled();
await reviewButton.click();
await expect(page.getByText(/no longer available|out of stock/i).first()).toBeVisible();
```

Keep the existing cart-drawer disabled assertion; this task changes checkout guidance only.

- [ ] **Step 8: Run the focused tests and verify red**

Run:

```bash
npx playwright test tests/e2e/smoke.spec.ts --grep "checkout|buy now"
```

Expected: failures for the new reservation heading, progress labels, CTA labels, mobile summary toggle, trust copy, and overflow behavior because implementation still uses the old checkout presentation.

- [ ] **Step 9: Commit the red tests**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test: specify private checkout experience"
```

---

### Task 2: Establish the Reservation Hierarchy and Honest Copy

**Files:**

- Modify: `src/contracts/checkout.contract.ts:3-115`
- Modify: `src/pages/CheckoutPage.tsx:1-617`
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**

- Consumes: existing `CheckoutFormValues`, payment method values, `stepStatus`, field validation, and shared primitives.
- Produces: `checkoutContract.experience`, updated payment notes, and the new visible reservation hierarchy.

- [ ] **Step 1: Add approved presentation copy to the existing checkout contract**

Add this object after `progressLabel`:

```ts
experience: {
  opening: {
    eyebrow: 'Private Order',
    heading: 'Your selection, reserved.',
    support:
      'We will hold your fragrances while you complete a private, manually reviewed order.',
  },
  progress: ['Delivery', 'Payment', 'Private Review'],
  delivery: {
    heading: 'Where should we send your fragrance?',
    support: 'These details are used only to arrange your delivery and order updates.',
  },
  payment: {
    heading: 'Choose how you would like to complete your order.',
  },
  proof: {
    heading: 'Send Your Private Confirmation',
    support: 'Your confirmation is reviewed manually by the Dotfumes house.',
    control: 'Add Payment Confirmation',
    constraints: 'JPG, PNG, WEBP, or PDF. Maximum 5 MB.',
    selected: 'Confirmation Ready',
    ready: 'Ready for manual house review.',
  },
  trust: [
    {
      title: 'Reserved Selection',
      body: 'Your fragrance stays attached to this order while you complete checkout.',
    },
    {
      title: 'Manual House Review',
      body: 'A Dotfumes team member reviews each payment confirmation.',
    },
    {
      title: 'Order Reference',
      body: 'A unique order ID is created when your request is sent.',
    },
  ],
  cta: {
    reviewSelection: 'Review Your Reserved Selection',
    initial: 'Reserve Your Selection',
    partial: 'Continue Your Private Order',
    payment: 'Choose Payment Method',
    proof: 'Add Private Confirmation',
    readyPrefix: 'Send for Private Review',
    submitting: 'Sending to the House…',
  },
},
```

Replace the three payment notes with:

```ts
note: value === 'bank-transfer'
  ? 'Receive the account and amount for your private order.'
  : 'Receive the wallet and amount for your private order.';
```

Implement them as literal strings in each existing method object; do not introduce a runtime `value` variable.

Update the existing slip error copy to use `5 MB`:

```ts
size: 'Your payment slip exceeds 5 MB. Please upload a smaller file.',
```

Do not change any field rule, method value, step field list, accepted MIME type, byte limit, or fixture.

- [ ] **Step 2: Replace the campaign opening**

In `CheckoutFlow`, bind `const { experience } = checkoutContract;` and replace the old eyebrow, heading, and two paragraphs with:

```tsx
<span className="text-small font-bold uppercase tracking-wider text-brand-gold">
  {experience.opening.eyebrow}
</span>
<h1 className="mt-4 max-w-2xl text-balance font-serif text-5xl leading-tight tracking-tight md:text-6xl">
  {experience.opening.heading}
</h1>
<p className="mt-4 max-w-xl text-body leading-7 text-on-light-secondary">
  {experience.opening.support}
</p>
```

Keep the opening in the first grid cell and reduce its bottom spacing so the first delivery control remains in the first desktop viewport.

- [ ] **Step 3: Replace progress cards with one semantic hairline row**

Derive visual state from the existing two-step status:

```ts
const progressStates = [
  stepStatus.details ? 'complete' : 'current',
  !stepStatus.details ? 'upcoming' : stepStatus.payment ? 'complete' : 'current',
  stepStatus.payment ? 'current' : 'upcoming',
] as const;
```

Render:

```tsx
<ol
  className="mt-8 flex items-center gap-3 border-y border-on-light-subtle py-4"
  aria-label={checkoutContract.progressLabel}
>
  {experience.progress.map((label, index) => (
    <li
      key={label}
      aria-current={progressStates[index] === 'current' ? 'step' : undefined}
      className="flex min-w-0 flex-1 items-center gap-3"
    >
      <span
        className={cn(
          'truncate text-caption uppercase tracking-wide',
          progressStates[index] === 'complete' && 'text-brand-gold',
          progressStates[index] === 'current' && 'font-semibold text-brand-black',
          progressStates[index] === 'upcoming' && 'text-on-light-subtle',
        )}
      >
        {label}
      </span>
      {index < experience.progress.length - 1 ? (
        <span className="h-px min-w-3 flex-1 bg-ink-muted" aria-hidden="true" />
      ) : null}
    </li>
  ))}
</ol>
```

Do not use status cards, icons, pills, or animated progress.

- [ ] **Step 4: Reframe delivery and payment section headings**

Replace numbered/system headings with:

```tsx
<div>
  <h2 className="font-serif text-2xl">{experience.delivery.heading}</h2>
  <p className="mt-2 text-label leading-6 text-on-light-muted">{experience.delivery.support}</p>
</div>
```

and:

```tsx
<fieldset className="space-y-8">
  <legend className="max-w-2xl font-serif text-2xl">{experience.payment.heading}</legend>
  <Stack
    gap={3}
    className={cn(
      errors.paymentMethod && 'ring-1 ring-red-300 ring-offset-4 ring-offset-brand-white',
    )}
  >
    {checkoutContract.paymentMethods.map((option) => {
      const selected = values.paymentMethod === option.value;

      return (
        <label
          key={option.value}
          className={cn(
            'cursor-pointer border px-4 py-4 transition-colors focus-within:ring-2 focus-within:ring-brand-gold focus-within:ring-offset-2 focus-within:ring-offset-brand-white',
            selected
              ? 'border-brand-black bg-brand-black text-brand-white'
              : 'border-on-light-muted bg-brand-white hover:border-on-light-strong',
          )}
        >
          <input
            type="radio"
            name={checkoutContract.fields.paymentMethod.name}
            className="sr-only"
            value={option.value}
            checked={selected}
            onChange={(event) => setField('paymentMethod', event.target.value)}
            onBlur={() => validateField('paymentMethod')}
          />
          <p className="text-small font-bold uppercase tracking-wide">{option.label}</p>
          <p
            className={cn(
              'mt-2 text-label leading-5',
              selected ? 'text-on-dark-secondary' : 'text-on-light-secondary',
            )}
          >
            {option.note}
          </p>
        </label>
      );
    })}
  </Stack>
  {errors.paymentMethod ? <FieldError message={errors.paymentMethod} /> : null}
</fieldset>
```

Keep the existing `Grid`, `CheckoutInput`, boxed `Input`, payment radio inputs,
selection behavior, and error placement. Add only hairline section dividers and
wider section spacing using existing Tailwind steps. The shared `fieldset` and
`legend` give the radio group one programmatic name without changing its values
or behavior.

- [ ] **Step 5: Make method notes calm and exact without fabricating details**

Use the updated contract notes in the existing method cards. After a method is selected, add a polite status line below the radio group:

```tsx
<p className="text-label leading-6 text-on-light-secondary" role="status" aria-live="polite">
  {selectedPaymentMethod
    ? `${selectedPaymentMethod.label} selected. Complete the transfer using the details provided by Dotfumes, then add your confirmation below.`
    : 'Choose one of the available payment methods to continue.'}
</p>
```

Derive `selectedPaymentMethod` with:

```ts
const selectedPaymentMethod = checkoutContract.paymentMethods.find(
  (method) => method.value === values.paymentMethod,
);
```

Do not render a recipient, account number, wallet number, bank name, copy control, or authoritative exact-amount label because no such source exists in the current frontend contract.

- [ ] **Step 6: Run the focused hierarchy tests**

Run:

```bash
npx playwright test tests/e2e/smoke.spec.ts --grep "reservation|payment choices|validation errors"
```

Expected: reservation hierarchy, semantic progress, all three methods, and inline validation pass. CTA and mobile-summary tests may remain red until Tasks 3 and 4.

- [ ] **Step 7: Commit**

```bash
git add src/contracts/checkout.contract.ts src/pages/CheckoutPage.tsx tests/e2e/smoke.spec.ts
git commit -m "feat: establish private checkout hierarchy"
```

---

### Task 3: Keep the Fragrance Present on Desktop and Mobile

**Files:**

- Modify: `src/pages/CheckoutPage.tsx:98-118`
- Modify: `src/pages/CheckoutPage.tsx:619-681`
- Modify: `src/components/cart/CartLineItem.tsx:194-260`
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**

- Consumes: current cart selectors, `CartItem.shortDescription`, product image, quantity actions, `formatCurrency`, and availability maps.
- Produces: responsive `Reserved for You` summary and checkout-only fragrance storytelling.

- [ ] **Step 1: Reorder existing grid children without duplicating state**

Change the form from mobile `order-2` to `order-3`. Change the summary from mobile `order-3` to `order-2`.

Keep desktop placement explicit:

```tsx
className = 'order-3 space-y-14 lg:col-start-1 lg:row-start-2';
```

and:

```tsx
className = 'order-2 h-fit shadow-sm lg:order-3 lg:col-start-2 lg:row-span-2 lg:sticky lg:top-28';
```

This places the existing summary after the opening and before delivery on mobile while preserving the desktop sidebar.

- [ ] **Step 2: Add a controlled mobile summary disclosure**

Add:

```ts
const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
```

inside `CheckoutSummary`, converting it from an expression body to a block body.

Render a mobile-only button:

```tsx
<button
  type="button"
  className={cn(
    'flex w-full items-center justify-between gap-4 p-5 text-left lg:hidden',
    focusRing,
  )}
  aria-expanded={isSummaryExpanded}
  aria-controls="checkout-summary-details"
  onClick={() => setIsSummaryExpanded((expanded) => !expanded)}
>
  <span className="min-w-0">
    <span className="block font-serif text-heading">Reserved for You</span>
    <span className="mt-1 block truncate text-label text-on-light-muted">
      {items[0]?.name ?? 'Your selection'} · {formatCurrency(total)}
    </span>
  </span>
  <span className="text-caption uppercase tracking-wide text-brand-gold">
    {isSummaryExpanded ? 'Close' : 'View'}
  </span>
</button>
```

Wrap the existing summary body:

```tsx
<div
  id="checkout-summary-details"
  className={cn(
    'border-t border-on-light-subtle p-5 lg:block lg:border-t-0 lg:p-6',
    isSummaryExpanded ? 'block' : 'hidden',
  )}
>
  <h2 className={cn(headingMd, 'hidden lg:block')}>Reserved for You</h2>
  <div className="mt-6 space-y-6 lg:mt-8">
    {items.length === 0 ? (
      <div className="py-10 text-center">
        <p className="text-small uppercase tracking-wide text-on-light-muted">
          Your selection is empty.
        </p>
        <Link
          to="/collection"
          className={cn(
            'mt-8 inline-flex border-b border-on-light-muted pb-1 text-caption uppercase',
            tracking.wide,
            focusRing,
          )}
        >
          Explore Collection
        </Link>
      </div>
    ) : (
      items.map((item) => (
        <CartLineItem
          key={item.id}
          itemId={item.id}
          variant="checkout"
          stock={latestProductById.get(item.id)?.stock ?? item.stock}
          isUnavailable={availabilityIssueByItem.has(item.id)}
        />
      ))
    )}
  </div>
  <div className="mt-8 space-y-3 border-t border-on-light-muted pt-6">
    <div className="flex items-end justify-between">
      <span className="text-caption uppercase tracking-wider text-on-light-muted">Fragrances</span>
      <span className="text-body text-on-light-secondary">{totalItems}</span>
    </div>
    <div className="flex items-end justify-between gap-4">
      <span className="text-caption uppercase tracking-wider text-on-light-muted">
        Total reserved
      </span>
      <span className={headingMd}>{formatCurrency(total)}</span>
    </div>
  </div>
</div>
```

Do not duplicate quantity controls or cart mutations.

- [ ] **Step 3: Add scent continuity only to the checkout line item**

In the existing checkout branch, place this directly after the fragrance name:

```tsx
<p className="mt-1 line-clamp-2 text-label leading-5 text-on-light-muted lg:line-clamp-1">
  {item.shortDescription}
</p>
<p className="mt-2 text-caption text-brand-gold">Held for your private order</p>
```

Remove the visible checkout SKU. Keep unit price, quantity controls, remove action, and current unavailable-state message.

Replace the normal `Stock: ${availableStock}` line with no output:

```tsx
{
  isUnavailable ? (
    <p className="mt-3 text-small text-on-light-muted">Out of stock — remove to continue</p>
  ) : null;
}
```

Do not change the drawer branch.

- [ ] **Step 4: Reduce the summary's receipt emphasis**

Rename:

```tsx
Items -> Fragrances
Subtotal -> Total reserved
```

Use the same computed `total` and `formatCurrency`. Do not call it an authoritative payable amount and do not change price calculation.

- [ ] **Step 5: Run responsive product-continuity tests**

Run:

```bash
npx playwright test tests/e2e/smoke.spec.ts --grep "mobile checkout|buy now|overflow"
```

Expected: mobile summary placement, expansion, reservation microcopy, and 320 px overflow tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/CheckoutPage.tsx src/components/cart/CartLineItem.tsx tests/e2e/smoke.spec.ts
git commit -m "feat: keep fragrance present through checkout"
```

---

### Task 4: Make Proof, Trust, and the CTA Feel Guided

**Files:**

- Modify: `src/pages/CheckoutPage.tsx:128-617`
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**

- Consumes: `values`, `slipFile`, `stepStatus`, `canSubmit`, `isSubmitting`, `shouldBlockCheckout`, `total`, `submitOrder`, and current validation/focus behavior.
- Produces: UI-only `CheckoutGuidance`, private-confirmation framing, one honest trust block, and an always-actionable submit control.

- [ ] **Step 1: Add a pure presentation-only CTA derivation**

Add above `CheckoutFlow`:

```ts
interface CheckoutGuidance {
  label: string;
  support: string;
}

interface GetCheckoutGuidanceOptions {
  hasItems: boolean;
  shouldBlockCheckout: boolean;
  hasStartedDelivery: boolean;
  deliveryComplete: boolean;
  hasPaymentMethod: boolean;
  hasSlip: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  total: number;
}

const getCheckoutGuidance = ({
  hasItems,
  shouldBlockCheckout,
  hasStartedDelivery,
  deliveryComplete,
  hasPaymentMethod,
  hasSlip,
  canSubmit,
  isSubmitting,
  total,
}: GetCheckoutGuidanceOptions): CheckoutGuidance => {
  const labels = checkoutContract.experience.cta;

  if (isSubmitting) {
    return {
      label: labels.submitting,
      support: 'Keep this page open while your request is sent.',
    };
  }
  if (!hasItems || shouldBlockCheckout) {
    return {
      label: labels.reviewSelection,
      support: 'Review the fragrance attached to this order before continuing.',
    };
  }
  if (!hasStartedDelivery) {
    return {
      label: labels.initial,
      support: 'Start with the delivery details for this private order.',
    };
  }
  if (!deliveryComplete) {
    return {
      label: labels.partial,
      support: 'We will guide you to the next delivery detail.',
    };
  }
  if (!hasPaymentMethod) {
    return {
      label: labels.payment,
      support: 'Select how you would like to complete the order.',
    };
  }
  if (!hasSlip) {
    return {
      label: labels.proof,
      support: 'Add the confirmation for manual house review.',
    };
  }
  if (canSubmit) {
    return {
      label: `${labels.readyPrefix} - ${formatCurrency(total)}`,
      support: 'A unique order ID will be created when the request is sent.',
    };
  }
  return {
    label: labels.partial,
    support: 'Review the highlighted detail to continue.',
  };
};
```

This adds no state and performs no side effects.

- [ ] **Step 2: Derive guidance from existing values**

Pass the existing display total into the flow:

```tsx
<CheckoutFlow
  items={items}
  total={total}
  allProducts={allProducts}
  allowOutOfStockCheckout={allowOutOfStockCheckout}
  shouldBlockCheckout={shouldBlockCheckout}
  availabilityMessage={availabilityMessage}
/>
```

Add `total: number` to `CheckoutFlowProps` and destructure it in
`CheckoutFlow`. Then derive guidance inside `CheckoutFlow`:

```ts
const deliveryFieldNames = checkoutContract.steps[0].fields;
const hasStartedDelivery = deliveryFieldNames.some((field) => values[field].trim().length > 0);
const guidance = getCheckoutGuidance({
  hasItems: items.length > 0,
  shouldBlockCheckout,
  hasStartedDelivery,
  deliveryComplete: stepStatus.details,
  hasPaymentMethod: Boolean(values.paymentMethod),
  hasSlip: Boolean(slipFile),
  canSubmit,
  isSubmitting,
  total,
});
```

Pass `total` from `CheckoutPage` into `CheckoutFlow`. This is display-only and uses the same total already rendered in the summary.

- [ ] **Step 3: Reframe the proof section**

Replace the old heading and upload-first copy with:

```tsx
<div>
  <h2 className="font-serif text-2xl">{experience.proof.heading}</h2>
  <p className="mt-2 text-label leading-6 text-on-light-muted">{experience.proof.support}</p>
</div>
```

Inside the existing upload label:

```tsx
<p className="text-small font-bold uppercase tracking-wide">
  {experience.proof.control}
</p>
<p className="mt-1 text-label text-on-light-secondary">
  {experience.proof.constraints}
</p>
```

In the selected preview:

```tsx
<motion.div
  key="slip-preview"
  role="status"
  aria-live="polite"
  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
  exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
  transition={{ duration: reduceMotion ? 0 : duration.fast, ease: easing.standard }}
  className="border border-on-light-muted p-4"
>
  <p className="text-caption uppercase tracking-wide text-brand-gold">
    {experience.proof.selected}
  </p>
  <p className="mt-2 text-label text-on-light-secondary">{experience.proof.ready}</p>
</motion.div>
```

Keep the existing `AssetImage` or PDF fallback, filename, size, and action after
these two status lines inside the same `motion.div`. Rename `Remove slip` to
`Remove Confirmation`. Keep the file input, accept list, size/type validation,
preview URL, cleanup, and animations unchanged.

- [ ] **Step 4: Replace operational cards with one honest trust block**

Remove the current shield card and `What Happens Next` card. Render:

```tsx
<section
  className="grid gap-6 border-y border-on-light-subtle py-8 md:grid-cols-3"
  aria-label="How Dotfumes handles this order"
>
  {experience.trust.map((item) => (
    <div key={item.title}>
      <h2 className="text-small font-bold uppercase tracking-wide text-brand-black">
        {item.title}
      </h2>
      <p className="mt-2 text-label leading-6 text-on-light-secondary">{item.body}</p>
    </div>
  ))}
</section>
```

Do not render `ShieldCheck`, a badge, `secure`, `encrypted`, `private storage`, or `not shown publicly`.

- [ ] **Step 5: Make the existing submit path visually actionable**

Replace the old button:

```tsx
<Button
  type="submit"
  variant="primary"
  loading={isSubmitting}
  disabled={isSubmitting}
  className="w-full px-5 py-4 tracking-wide sm:px-8 sm:tracking-wider"
>
  {guidance.label}
</Button>
<p className="text-center text-small leading-6 text-on-light-secondary" aria-live="polite">
  {guidance.support}
</p>
```

Do not add an alternate click handler. The enabled control submits the existing form, and `submitOrder` continues to:

- guard duplicate in-flight submission;
- check cart/availability;
- call `validateAll`;
- focus the first invalid field;
- submit only when current requirements are satisfied.

- [ ] **Step 6: Keep loading and motion restrained**

Use existing `duration.fast` and `easing.standard` for proof/status reveals. Animate opacity and `y` only. Keep current `useReducedMotion` branches and global reduced-motion behavior.

- [ ] **Step 7: Run checkout behavior tests**

Run:

```bash
npx playwright test tests/e2e/smoke.spec.ts --grep "checkout"
```

Expected: all checkout tests pass, including missing details, CTA progression, hidden-control focus, successful submission, honest trust language, mobile summary, overflow, and unavailable inventory.

- [ ] **Step 8: Commit**

```bash
git add src/pages/CheckoutPage.tsx tests/e2e/smoke.spec.ts
git commit -m "feat: guide checkout with concierge actions"
```

---

### Task 5: Verify Scope, Accessibility, Responsiveness, and Design Fidelity

**Files:**

- Create: `design-qa.md`
- Inspect only: all prohibited files in Global Constraints
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**

- Consumes: completed implementation, approved Superdesign composition, current checkout audit screenshots, and local browser rendering.
- Produces: verified build, responsive evidence, unchanged architecture proof, and blocking design-QA result.

- [ ] **Step 1: Run static checks**

Run:

```bash
npm run lint
npm run format
npm run build
```

Expected: all commands exit `0`. If `npm run format` reports unrelated pre-existing formatting changes, run Prettier only against the checkout files and record the unrelated report without modifying unrelated files.

- [ ] **Step 2: Run the full browser suite**

Run:

```bash
npm run test:e2e
```

Expected: all Playwright tests pass.

- [ ] **Step 3: Verify prohibited scope is untouched**

Run:

```bash
git diff --name-only 37a451f..HEAD
```

Expected changed implementation paths are limited to:

```text
src/contracts/checkout.contract.ts
src/pages/CheckoutPage.tsx
src/components/cart/CartLineItem.tsx
tests/e2e/smoke.spec.ts
design-qa.md
docs/superpowers/plans/2026-07-30-private-checkout-perception.md
```

Confirm no match:

```bash
git diff --name-only 37a451f..HEAD | rg '^(apps-script/|src/lib/googleSheetsBackend\\.ts|src/services/orderSubmissionService\\.ts|src/store/)'
```

Expected: no output.

- [ ] **Step 4: Capture required states in the in-app browser**

Use the repository's existing browser workflow at these viewports:

```text
Desktop: 1440 x 1000
Mobile: 390 x 844
Narrow mobile: 320 x 812
```

Capture:

1. empty checkout;
2. selected fragrance and untouched delivery;
3. partial delivery after CTA guidance;
4. each of Bank Transfer, Easypaisa, and JazzCash selected;
5. proof idle;
6. proof selected;
7. ready to submit;
8. unavailable inventory;
9. mobile summary collapsed;
10. mobile summary expanded.

Verify visually:

- no horizontal overflow;
- boxed inputs match the existing primitive;
- no badges or invented account details;
- product image/name/scent/total stay visible or one action away;
- CTA text does not wrap at desktop and remains readable at 320 px;
- errors remain adjacent to fields;
- summary does not cover the form;
- reduced motion removes transitions.

- [ ] **Step 5: Run same-input design QA**

Prepare one comparison board per key state with:

- left: approved Superdesign Quiet Reservation composition;
- right: implementation screenshot at the same viewport and state;
- written fidelity corrections: boxed inputs, three payment methods, no badge, no mock account data.

Audit hierarchy, spacing, typography, borders, shadows, image crop, product continuity, CTA prominence, mobile order, focus state, and overflow.

Write findings to project-root `design-qa.md` with severity headings:

```md
# Design QA

## Source

- Superdesign draft: c3ef4e62-be9e-4dfd-93af-090bae34c265
- Fidelity corrections: boxed inputs, three payment methods, no badge, no mock account data

## P0

None.

## P1

None.

## P2

None.

## Verified States

- Desktop 1440 x 1000
- Mobile 390 x 844
- Narrow mobile 320 x 812
- Empty, partial, payment-selected, proof-selected, ready, unavailable

final result: passed
```

Do not write `final result: passed` until every P0, P1, and P2 is fixed, re-captured, and compared again in the same input.

- [ ] **Step 6: Re-run final verification**

Run:

```bash
git diff --check
npm run lint
npm run build
npm run test:e2e
tail -n 1 design-qa.md
```

Expected:

- `git diff --check` exits `0`;
- lint, build, and E2E exit `0`;
- the final line is exactly `final result: passed`.

- [ ] **Step 7: Commit verified design QA**

```bash
git add design-qa.md
git commit -m "test: verify private checkout experience"
```

---

## Risk Register

| Risk                                                 | Level  | Mitigation                                                                          |
| ---------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| Enabling guidance changes old disabled-button tests  | Medium | Keep the same submit handler and validation gate; verify no invalid request is sent |
| Mobile summary reordering changes keyboard sequence  | Medium | Match DOM and visual order; test heading, summary toggle, then delivery             |
| CTA labels wrap at 320 px                            | Medium | Use responsive tracking/padding and explicit narrow-viewport test                   |
| Scent copy increases summary height                  | Low    | Clamp to two lines mobile and one line desktop                                      |
| Progress becomes too subtle                          | Low    | Preserve `aria-current` and clear black/gold/muted visual states                    |
| Privacy language overpromises current Drive behavior | High   | Exclude non-public claims until backend change is separately authorized             |
| Payment details are fabricated                       | High   | Render no recipient/account/wallet/quote fields without an existing source contract |
| Unrelated dirty worktree changes enter commits       | Medium | Stage exact task files only and inspect each commit                                 |

## Expected Outcome

Within the allowed UX-only scope:

- reservation opening replaces form-first language;
- product remains emotionally present;
- progress becomes quiet orientation;
- all three payment choices remain intact;
- proof is framed as manual confirmation handover;
- trust language is specific and technically honest;
- the CTA always gives a useful next action without bypassing validation;
- backend, APIs, stores, pricing, payloads, and submission remain unchanged.

The design can reach a strong concierge perception, but a genuine privacy promise
and exact payment-detail reveal require separately authorized backend work because
the current repository does not support those claims.
