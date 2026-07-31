# 03 — Data Model Inventory

## TypeScript models (verified, `src/models/order.ts`)

```
PaymentMethod = 'bank-transfer' | 'easypaisa' | 'jazzcash'
PaymentStatus = 'Pending Verification' | 'Payment Pending' | 'Verified' | 'Rejected'
OrderStatus   = 'New' | 'Preparing' | 'Delivered' | 'Cancelled' | 'Processing' | 'Completed'
OrderSubmissionMode = 'supabase'   // single-value union — vestigial from a prior multi-mode design
```

`CheckoutFormValues`, `OrderLineItem`, `CustomerDetails`, `SlipDetails`, `OrderPayload`,
`OrderDraft`, `OrderSubmissionResult` — full shapes in `src/models/order.ts:14-89` (read in full
this pass).

**Mismatch, not yet reconciled:** the TS `OrderStatus`/`PaymentStatus` string unions
(`'New'`/`'Pending Verification'`/etc., Title Case) do **not** match the actual Postgres check
constraints on `public.orders` (`order_status` = `'new'|'processing'|'delivered'|'cancelled'`,
`payment_status` = `'pending'|'verified'|'rejected'`, both lower-case, and neither has
`'Preparing'`/`'Completed'`/`'Payment Pending'`/`'Pending Verification'` as valid values). This is
an existing, pre-task inconsistency between the frontend model and the live schema — not
introduced by this survey. Flagged as a P1 in the unresolved-issues section of the final report;
not fixed here since it falls outside "foundation only" scope and touches the `orders` table this
task is explicitly told not to touch.

## Database schema (verified via `mcp__supabase__list_tables`, schemas: public/private/auth/storage)

**`public.products`** (5 rows) — `id uuid pk default gen_random_uuid()`, `sku text unique
nullable`, `slug text unique`, `name text`, `description text nullable`, `category text nullable
check in ('Men','Women','Unisex')`, `price numeric check >= 0`, `image_url text nullable`,
`stock int default 0 check >= 0`, `active bool default true`, `created_at`/`updated_at
timestamptz default now()`. RLS enabled.

**`public.orders`** (0 rows) — `id uuid pk`, `order_code text unique`, `customer_name text`,
`first_name`/`last_name text nullable`, `phone text`, `email text nullable`, `city text nullable`,
`address text`, `items jsonb`, `subtotal numeric check >= 0`, `delivery_fee numeric default 0
check >= 0`, `total numeric check >= 0`, `currency text default 'USD'`, `payment_method text check
in ('bank-transfer','easypaisa','jazzcash')`, `payment_status text default 'pending' check in
('pending','verified','rejected')`, `order_status text default 'new' check in
('new','processing','delivered','cancelled')`, `slip_path`/`slip_url text nullable`,
`whatsapp_message text nullable`, `admin_notes text nullable`, timestamps. RLS enabled.

**`public.settings`** (2 rows) — `id uuid pk`, `key text unique`, `value jsonb`, `is_public bool
default false`, `updated_at timestamptz`. RLS enabled. One row has `key='checkout'`, read by the
frontend for `CatalogSettings` (`hideInactiveProducts`, `showOutOfStockProducts`,
`allowOutOfStockCheckout`, `lowStockThreshold`, `currency`) — `src/lib/supabaseBackend.ts:7-13,
115-129`.

**Storage**: `storage.buckets` has 1 row (private `payment-slips` bucket, per prior verified
project state — bucket name not re-queried by name this pass, only row count confirmed).
`storage.objects` has 1 row — [Inference, from prior session memory] a ~200-byte orphan test file,
not re-verified this pass.

**`private` schema** — referenced by the frontend's authorization model (`private.is_admin()`,
per prior session memory) but **not independently re-verified in this survey pass**: `list_tables`
was called with `schemas: ["public","private","auth","storage"]` and returned zero objects under
`private` in the tables list. [Unverified] whether `private.is_admin()` is a function (not a
table, so it wouldn't appear in `list_tables`) — I did not run `execute_sql` against
`information_schema.routines` to confirm the function still exists and its search_path is fixed.
This is a genuine gap, not an assumption I'm presenting as fact.

## Validation locations

- `src/lib/validation.ts` — `getCartAvailabilityIssues`/`getCartAvailabilityMessage`, client-side
  soft stock check (see 02-frontend-commerce-flow.md).
- `src/lib/normalize.ts` — `parseBoolean`, `parseNumber`, `parseText`, `isRecord` — defensive
  parsing of untrusted/loosely-typed values coming back from Supabase responses (used throughout
  `supabaseBackend.ts` and `AdminPage.tsx`).
- Zod: **not used anywhere found** — `package.json` has no `zod` dependency.
- Server-side validation logic (inside the `create-order` edge function) — not inspected this
  pass; function source not fetched.

## Hardcoded values

- Fallback WhatsApp number `923001234567` and fallback order email `orders@dotfumes.com`
  (`src/lib/config.ts:19-20`) — used only if the corresponding env var is unset. Not secrets, but
  worth noting as hardcoded business config.
- `LOW_STOCK_THRESHOLD = 3` duplicated in `AdminPage.tsx:44` and as `defaultCatalogSettings.lowStockThreshold`
  in `supabaseBackend.ts:67` — same value in two places, both overridable by the `settings` row's
  `lowStockThreshold`. Minor duplication, not a correctness bug at present since both fall back to
  the same number.
- `SIGNED_SLIP_URL_TTL_SECONDS = 60 * 10` (`AdminPage.tsx:45`) — signed URL lifetime for admin
  slip viewing.
