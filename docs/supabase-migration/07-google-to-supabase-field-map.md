# 07 — Google-to-Supabase Field Map

**Correction (2026-07-31, correction pass):** the original scope note below was wrong — the
Sheets column layout **is** recoverable from git history (`git show 8f484cf^:apps-script/
dotfumes-order-webapp.gs`), and was reconstructed this pass. See 01-google-backend-map.md for the
full endpoint/lifecycle reconstruction. The table below is now a real Sheets-column → Postgres-
column map, not a Postgres-only reference.

| Google Sheet column (verified, `ORDER_COLUMNS`/`PRODUCTS_COLUMNS_REQUIRED`/`SETTINGS_COLUMNS_REQUIRED`) | Current Postgres column | Note |
|---|---|---|
| Orders: `Order ID` | `orders.id` (uuid) / `orders.order_code` (text) | Sheet used a single free-text ID; Postgres splits into an internal `uuid` PK and a display `order_code` (`DF-YYYYMMDD-XXXXX`, server-generated in `create_order`) |
| Orders: `Customer Name` | `orders.customer_name`, `first_name`, `last_name` | Split further in Postgres |
| Orders: `Phone`, `Email`, `City`, `Address` | `orders.phone/email/city/address` | 1:1 |
| Orders: `Products`, `Quantity Summary` | `orders.items jsonb` | Sheet stored two parallel free-text renderings of the same data (`formatProductsForSheet_`); Postgres stores one structured `jsonb` array with authoritative `unitPrice`/`lineTotal` per line, computed server-side |
| Orders: `Subtotal`, `Delivery Fee`, `Total` | `orders.subtotal/delivery_fee/total numeric` | Sheet trusted client-submitted totals (no server recompute found in `doPost`); Postgres recomputes all three inside `create_order` from live `products.price` + `settings` — a verified correctness/security improvement |
| Orders: `Payment Method` | `orders.payment_method text check(...)` | Sheet had no enum constraint (free text); Postgres enforces `bank-transfer\|easypaisa\|jazzcash` |
| Orders: `Slip File Name`, `Slip URL` | `orders.slip_path`, `orders.slip_url` | Sheet's `Slip URL` was a Drive `ANYONE_WITH_LINK` URL (see 01); Postgres's `slip_path` is a private-bucket object key, resolved to a signed URL only for authenticated admins |
| Orders: `Payment Status`, `Order Status` | `orders.payment_status`/`order_status text check(...)` | Sheet had no enum constraint (`normalizeStatus_` free-text normalization only); Postgres enforces a fixed value set — see mismatch note below |
| Orders: `WhatsApp Message` | `orders.whatsapp_message` | Same free-text `wa.me` deep-link pattern in both systems |
| Orders: `Admin Notes` | `orders.admin_notes` | 1:1 |
| Products: `Product ID`, `Slug`, `Name`, `Price`, `Stock`, `Active`, `Category` | `products.id/slug/name/price/stock/active/category` | 1:1 in name; Sheet had no stock/price `>= 0` constraint (spreadsheet cell, unconstrained), Postgres enforces `products_price_check`/`products_stock_check` (`>= 0`) and `products_category_check` (`Men\|Women\|Unisex` only) |
| Products: `Short Description`, `Top/Heart/Base Notes`, `Tagline`, `Gender/Positioning` | **Not present** in current `public.products` columns (verified via `information_schema.columns`) | These fragrance-specific fields from the old Sheet have no Postgres equivalent yet — a real gap if/when Floor 1 (Catalog) is scoped, out of bounds for this task to add |
| Settings: `Key`, `Value`, `Description` | `settings.key/value(jsonb)` | Sheet's `Description` column has no Postgres equivalent (informational-only in the old sheet) |
| Admin auth: `ADMIN_READ_TOKEN` (shared secret, URL query param) | Supabase Auth session + `app_metadata.role='admin'` JWT claim, checked via `private.is_admin()` | Structural improvement — see 01 and 12-rls-and-authorization-audit.md |

The original Postgres-only table (still accurate for current TS↔DB field names) follows below,
unedited.

| Concept | Current field (Postgres) | Current field (TS, `OrderPayload`/`OrderLineItem`) | Note |
|---|---|---|---|
| Order identifier | `orders.order_code text unique` | `OrderPayload.orderId` | Server-generated code is authoritative post-submit (`orderSubmissionService.ts:51`) |
| Customer name | `orders.customer_name`, `first_name`, `last_name` | `CustomerDetails.firstName/lastName/fullName` | Both split and combined forms persisted |
| Contact | `orders.phone`, `orders.email` | `CustomerDetails.phone/email` | — |
| Address | `orders.address`, `orders.city` | `CustomerDetails.address/city` | — |
| Line items | `orders.items jsonb` | `OrderPayload.items: OrderLineItem[]` | Client sends only `slug`+`quantity`; server presumably resolves name/price/sku (unverified this pass, see 02) |
| Pricing | `orders.subtotal/delivery_fee/total numeric` | `OrderPayload.subtotal/deliveryFee/total` | Server-computed, client values overwritten on response |
| Payment method | `orders.payment_method text check(...)` | `CheckoutFormValues.paymentMethod`, `OrderPayload.paymentMethod` | Enum values match: `bank-transfer`/`easypaisa`/`jazzcash` |
| Payment status | `orders.payment_status text check('pending'\|'verified'\|'rejected')` | `PaymentStatus = 'Pending Verification'\|'Payment Pending'\|'Verified'\|'Rejected'` | **Mismatched value sets** — see 03-data-model-inventory.md |
| Order status | `orders.order_status text check('new'\|'processing'\|'delivered'\|'cancelled')` | `OrderStatus = 'New'\|'Preparing'\|'Delivered'\|'Cancelled'\|'Processing'\|'Completed'` | **Mismatched value sets** — extra TS values (`Preparing`, `Completed`) have no DB equivalent |
| Payment slip | `orders.slip_path`, `orders.slip_url` | `SlipDetails` (`fileName`, `fileSize`, `mimeType`, `previewUrl`, `referenceUrl`) | Slip stored in private `payment-slips` bucket; sent as base64 to the edge function, not uploaded directly by the client |
| Product | `products.sku/slug/name/price/stock/active/category` | `CatalogProductRow` | 1:1, verified field names match (`supabaseBackend.ts:15-25` maps directly) |
| Settings | `settings.value jsonb` (`key='checkout'`) | `CatalogSettings` | Parsed defensively with `parseBoolean`/`parseNumber` — DB value is not schema-validated at the Postgres level beyond being `jsonb` |
| Admin role | N/A (was `VITE_ADMIN_PASSWORD`) | `session.user.app_metadata.role === 'admin'` | Now Supabase Auth + JWT claim, not a hardcoded password |

No coupon, review, or shipment fields exist on either side — consistent with the "no premature
implementation" scope of this task.
