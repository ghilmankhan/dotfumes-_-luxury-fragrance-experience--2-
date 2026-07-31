# 02 — Frontend Commerce Lifecycle

Verified by reading `src/lib/config.ts`, `src/lib/supabaseClient.ts`, `src/lib/supabaseBackend.ts`,
`src/services/orderSubmissionService.ts`, `src/models/order.ts`, `src/lib/storage.ts`,
`src/lib/paymentSlip.ts`, and `src/pages/AdminPage.tsx` (partial, lines 1-120).

## Lifecycle stages

**Landing → Collection → Product** — [Unverified in this pass] catalog display components were
not opened; product data source is verified at the fetch layer: `fetchProductCatalogFromSupabase`
(`src/lib/supabaseBackend.ts:98`) queries `public.products`, ordered by `created_at`. Consumed by
`src/store/useProductCatalogStore.ts` (zustand store, not opened line-by-line this pass, listed
in commit `8f484cf` diff as changed +/- 118 lines).

**Cart** — `CartItem` type used throughout (`src/lib/validation.ts` imports it); cart state
management itself not opened this pass.

**Checkout** — `src/pages/CheckoutPage.tsx` (changed in `8f484cf`, not re-opened this pass since
its content wasn't material to the Google/Supabase boundary question). Form values captured as
`CheckoutFormValues` (`src/models/order.ts:14-22`): firstName, lastName, email, phone, address,
city, paymentMethod (`'bank-transfer' | 'easypaisa' | 'jazzcash'`).

**Payment-slip upload** — Handled client-side as a `File`, converted to base64
(`src/lib/supabaseBackend.ts:71-96`, `readFileAsBase64`) and sent inline in the `create-order`
edge function request body — not a direct Storage client upload from the browser. `src/lib/paymentSlip.ts`
provides `createSlipPreviewUrl`/`isImageSlip` for local UI preview only.

**Order submission** — `SupabaseOrderService.submit()` (`src/services/orderSubmissionService.ts:31-84`):
1. `ensureCartAvailability` — client-side stock check against the in-memory `products` list,
   **skippable if `allowOutOfStockCheckout` setting is true** (a soft check, not authoritative).
2. Builds a local `OrderPayload` via `buildOrderPayload` (`src/lib/order.ts`, not opened this pass).
3. Calls `submitOrderToSupabase` → `supabase.functions.invoke('create-order', ...)`, sending only
   `slug` + `quantity` per line item — **no price is sent from the client**
   (`src/lib/supabaseBackend.ts:173-176`).
4. The comment at `orderSubmissionService.ts:47-48` states pricing/stock/totals are computed
   "atomically in the create_order RPC" server-side — this is an author's code comment, not
   something I independently verified by reading the edge function source (out of scope this
   pass; the function is deployed and ACTIVE per `list_edge_functions`, but its source was not
   fetched with `get_edge_function`).
5. Response is treated as authoritative and overwrites the local order's `orderId`, `subtotal`,
   `deliveryFee`, `total`, and `items` (`orderSubmissionService.ts:49-69`).

**Confirmation** — `src/pages/OrderConfirmationPage.tsx` (changed in `8f484cf`, not re-opened).
`src/lib/storage.ts` persists the last order to `sessionStorage` (`LAST_ORDER_KEY`) for display —
client-side only, not a backend read.

**Admin dashboard** — `src/pages/AdminPage.tsx`. Login: email/password via
`getSupabaseClient()` (Supabase Auth), not the legacy `VITE_ADMIN_PASSWORD` gate. Session validity
for showing the dashboard is checked client-side via `isAdminSession()`
(`AdminPage.tsx:47-48`): `session.user.app_metadata?.role === 'admin'`. This is a **UX gate only**
— per prior verified project state (memory, not re-derived this pass), actual data access is
enforced server-side by RLS policies calling `private.is_admin()`, which reads the same
`app_metadata.role` claim. **I did not re-verify the `private.is_admin()` function body or the
RLS policies on `products`/`orders`/`settings` in this pass** — flagged as a gap; see
08-migration-risks.md.

## Where the frontend calculates vs. trusts values

| Value | Frontend behavior | Trust boundary |
|---|---|---|
| Product price | Read-only from `products.price`; never computed or overridden client-side in the order payload sent to the server (only `slug`+`quantity` sent) | Server-authoritative |
| Quantity | Client-controlled (cart state), sent to server, server presumably re-validates against stock — [Unverified] not confirmed by reading edge function source | Sent by client, re-validation unverified |
| Stock | Client does a soft pre-check (`ensureCartAvailability`) that can be bypassed via `allowOutOfStockCheckout` setting | Soft client check; server enforcement unverified this pass |
| Delivery fee | Not present in client payload; response fields `deliveryFee` come back from server | Server-authoritative |
| Subtotal / Total | Local values computed client-side for display before submit, but **overwritten by server response** after submit (`orderSubmissionService.ts:53-55`) | Server-authoritative post-submission |
| Payment status | Not set by client; default `'pending'` at DB level (`orders.payment_status` check constraint, from `list_tables`) | Server/DB-authoritative |
| Order status | Same — DB default `'new'`, check-constrained | Server/DB-authoritative |
| Coupon value | No coupon field found anywhere in `OrderPayload`, `CheckoutFormValues`, or the `orders` table schema | Not implemented |

## Storage usage

- `sessionStorage['dotfumes-last-order']` — last order snapshot for the confirmation page
  (`src/lib/storage.ts`). Contains customer PII (name, email, phone, address) client-side for the
  session duration — [Inference] acceptable for a confirmation-page UX pattern, flagged in
  05-security-findings.md as Informational, not a vulnerability.
- No `localStorage` usage found in the files read this pass.
