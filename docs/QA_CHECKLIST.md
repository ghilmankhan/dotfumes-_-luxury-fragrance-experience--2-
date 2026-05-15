# DOTFUMES QA Checklist (Phase 2)

Use this checklist before each release.

## A. Core Flow

- [ ] Home page loads with correct hero and navigation.
- [ ] Collection opens from home CTA.
- [ ] Product details open correctly by slug.
- [ ] Add to cart opens drawer and updates count.
- [ ] Cart quantity increment/decrement works and respects stock.
- [ ] Cart item removal updates totals immediately.
- [ ] Checkout opens from cart and navbar.
- [ ] Checkout blocks submit when cart is empty.
- [ ] Checkout submit succeeds with valid details + valid slip.
- [ ] Confirmation page displays order ID, total, payment method, and slip reference.

## B. Checkout Validation

- [ ] Missing first/last name shows inline error.
- [ ] Invalid email shows inline error.
- [ ] Phone without country code guidance is shown.
- [ ] Short/incomplete address is rejected.
- [ ] Missing city is rejected.
- [ ] No payment method selected is rejected.
- [ ] No slip file selected is rejected.
- [ ] Unsupported file type is rejected.
- [ ] Zero-byte file is rejected.
- [ ] File over 5MB is rejected.
- [ ] Slip can be replaced with another file.
- [ ] Slip can be removed after selection.

## C. Edge Cases

- [ ] Directly open `/checkout` in new tab with empty cart.
- [ ] Reload checkout after modifying cart.
- [ ] Double-click submit quickly; second submit must be blocked.
- [ ] Confirm special characters in name/address produce valid WhatsApp URL.
- [ ] Long order details still produce usable email handoff URL.
- [ ] Confirmation page reload with existing session order still works.
- [ ] Confirmation page reload with no session order redirects safely to checkout.
- [ ] Back button from confirmation does not recreate prior cart unexpectedly.
- [ ] Cart with stale/removed catalog item is blocked with guidance.
- [ ] Missing image asset shows graceful image-unavailable state.

## D. Integration Modes

### Frontend fallback mode (`VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL` empty)

- [ ] Checkout succeeds and stores latest order in sessionStorage.
- [ ] Confirmation clearly states private handoff mode.
- [ ] WhatsApp opens prefilled message.
- [ ] Email opens prefilled draft.

### Google Sheets mode (endpoint configured)

- [ ] Order submit sends payload to Apps Script.
- [ ] Confirmation shows returned slip URL if provided.
- [ ] Order appears in Google Sheet row.
- [ ] Slip file appears in Google Drive folder.
- [ ] Owner email notification is received.
- [ ] Backend failure shows premium error message and allows retry.

## E. Mobile + Accessibility

- [ ] Checkout form inputs are readable and usable on iOS Safari.
- [ ] File upload works on mobile Safari and Android Chrome.
- [ ] Focus states are visible for keyboard users.
- [ ] Error blocks use `role="alert"`.
- [ ] Reduced-motion users do not receive aggressive transitions.

## F. SEO + Indexing

- [ ] Product and collection pages have meaningful titles/descriptions.
- [ ] Product JSON-LD is present on product pages.
- [ ] Checkout page has `noindex,nofollow`.
- [ ] Confirmation page has `noindex,nofollow`.
- [ ] Canonical tag is set per route.

## G. Final Release Checks

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] No console errors during checkout and confirmation flow.
