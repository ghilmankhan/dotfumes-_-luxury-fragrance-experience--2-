# 11 — `create-order` Edge Function Audit

Source fetched and read in full via `mcp__supabase__get_edge_function(function_slug="create-order")`
this pass — not inferred from frontend comments or migration names, per the task's own directive.
Function metadata: `version: 2`, `status: ACTIVE`, `verify_jwt: false`, `updated_at` corresponds to
2026-07-31 (Unix ms `1785437551741`).

## Authentication and abuse control

| Item | Finding | Severity |
|---|---|---|
| `verify_jwt` | `false` — intentional per an in-code comment ("customers are anonymous, publishable keys are not JWTs"). Correct architectural choice for a guest-checkout public endpoint; protection is meant to come from validation + honeypot + server-side authority, not JWT verification. | Informational |
| Guest access | Fully anonymous — no auth required or possible for this endpoint | Informational |
| Rate limiting | **None found in the function source.** No per-IP or per-key throttling logic exists in this file. Supabase platform-level rate limits (if any) are a project/infra setting, not visible in this source — **[Unverified]**. | **P1** — an unauthenticated endpoint with no application-level rate limit can be hit repeatedly; the honeypot only stops naive bots, not a targeted script |
| CAPTCHA / bot protection | Honeypot field only (`body.honeypot` — if non-empty, silently returns a fake success response without writing anything, so bots can't detect rejection). No CAPTCHA. | P2 — same class as above, honeypot is a weak control on its own |
| CORS | `Access-Control-Allow-Origin: "*"` — wide open to any origin. Reasonable for a public unauthenticated POST endpoint with no cookie/session reliance (no CSRF-relevant credential to steal), but worth naming explicitly as unrestricted. | Informational (not a vulnerability given no session/cookie auth is involved) |
| Allowed methods | `OPTIONS` (preflight) and `POST` only; all others return 405 | Informational — correct |
| Body-size handling | No explicit request-body size cap found before `req.json()` is called — relies on the Deno/edge-runtime platform default request-size limit, which is **[Unverified]** from this source alone. The payment-slip base64 is separately capped at `MAX_SLIP_BYTES = 5 * 1024 * 1024` (5 MB) post-decode. | P2 — informational unless the platform default is unexpectedly large |
| Request validation | Extensive: every customer field is trimmed and length-capped via `asTrimmedString`, payment method checked against a fixed allow-list, item slugs/quantities validated and capped (`MAX_ITEMS = 50`, `MAX_QTY_PER_ITEM = 20`), duplicate slugs collapsed before the per-item cap check (so quantity can't be split across duplicate lines to dodge the per-item limit) | Verified — good practice |
| Replay protection / idempotency | **None.** Each call generates a fresh `orderId = crypto.randomUUID()` server-side; there is no client-supplied idempotency key and no dedup check. A retried request (e.g., a double-click, or a network retry) will create a **second, distinct order** with its own UUID, decrementing stock twice. | **P1** — real double-submission risk, not just theoretical; no code path prevents it |

## Order validation

| Item | Finding |
|---|---|
| Product lookup | Cheap pre-check via `supabase.from("products").select("slug,name,stock,active").in("slug", ...)` before uploading the slip — for a fast, friendly error message. Explicitly commented as non-authoritative ("authoritative stock/pricing check happens atomically in `create_order`"). |
| Active-product validation | Both here (pre-check) and again inside `create_order` (`if not found or v_product.active = false then raise exception 'UNAVAILABLE:%'`) — defense in depth, correct |
| Quantity validation | Capped 1–20 per line in both the edge function and again inside `create_order` (`v_item.quantity < 1 or v_item.quantity > 20`) |
| Price authority | **Fully server-side.** The edge function never sends a price to Postgres — `create_order` reads `products.price` directly and computes `v_line_total := round(v_product.price * v_item.quantity, 2)`. Client cannot influence price. **VERIFIED**, not just reported. |
| Delivery-fee authority | Server-side — `create_order` reads `settings` (`key='checkout'`) for `deliveryFee`, clamped `greatest(..., 0)`. Client cannot influence it. |
| Total calculation | Server-side, `v_total := round(v_subtotal + v_delivery_fee, 2)` |
| Currency handling | Server-side, from `settings.value->>'currency'`, defaulted to `'USD'` if unset/blank — no per-order currency selection exists |
| Stock validation | Server-side, `select ... for update` row-locks each product row before checking `stock < quantity`; `allowOutOfStockCheckout` is an admin-controlled settings flag that can bypass the check |
| Concurrent stock behavior | `for update` row lock inside a loop **sorted by slug** (explicit comment: "so concurrent orders lock product rows in the same order") — a real, correct deadlock-avoidance pattern for multi-row locking. This is a meaningfully strong concurrency guarantee, stronger than the old Sheets `LockService` approach (see 01). |
| Atomic transaction behavior | The entire `create_order` function body runs as one Postgres function call — stock decrement + order insert are atomic within it. Combined with the edge function's own compensating action (`storage.remove` on order failure), the overall flow is transactionally sound **except** for the idempotency gap noted above (a retried *successful* call is not caught — atomicity within one call is not the same as exactly-once across calls) |
| Out-of-stock behavior | Raises a typed exception (`OUT_OF_STOCK:<stock>:<name>`) caught and mapped to a friendly 400 by `mapOrderError` in the edge function |

## Payment-slip handling

| Item | Finding |
|---|---|
| Base64 validation | Decoded via `atob`, wrapped in try/catch → 400 on corrupt data |
| MIME validation | Checked against a fixed map (`png`/`jpeg`/`webp`/`pdf`) before decode; matches the bucket's own `allowed_mime_types` config (verified via `storage.buckets` — identical list) — consistent, no mismatch found |
| File-size limit | 5 MB (`MAX_SLIP_BYTES`), matches `storage.buckets.file_size_limit` (5242880 bytes = 5 MiB) exactly — verified consistent |
| Filename generation | `${orderId}/slip.${slipExt}` — UUID-scoped path, extension derived from validated MIME, not from client-supplied filename (avoids path-traversal/extension-spoofing via filename) |
| Storage path | Private bucket `payment-slips`, `public: false` (verified via `storage.buckets`) |
| Bucket privacy | Private — verified, not just assumed |
| Overwrite behavior | `upsert: false` — a collision (same `orderId` reused) would fail the upload rather than silently overwrite; given `orderId` is a fresh `crypto.randomUUID()` per call, practical collision risk is negligible |
| Error cleanup | On order-creation failure *after* a successful slip upload, the function calls `supabase.storage.from("payment-slips").remove([slipPath])` — verified explicit cleanup path exists |
| Orphan object risk | **Partial gap:** if the **edge function process itself crashes or times out** between a successful slip upload and the `create_order` RPC call (or between RPC success and the HTTP response), the compensating `remove()` call never runs, and the slip stays in storage with no corresponding order row — a low-probability but real orphan-object path. No cleanup job/cron was found to reconcile this. **P2.** |
| Public/signed URL handling | Not handled in this function at all — no URL is generated or returned to the client here; admin-side signed-URL generation (referenced in `AdminPage.tsx` as `SIGNED_SLIP_URL_TTL_SECONDS`) is a separate code path not audited in this pass (out of scope — `AdminPage.tsx` beyond `isAdminSession` was not fully re-read this session) |

## Database writes

| Item | Finding |
|---|---|
| Service-role usage | The edge function creates its Supabase client with `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env` — a managed edge-function secret, never present in any repo file (verified via `grep` across `src/`) |
| Direct table writes | Only one direct write outside the RPC: the pre-check `SELECT` on `products` (read-only). All actual mutations (`products.stock` decrement, `orders` insert) happen inside `create_order`, not via direct `.insert()`/`.update()` calls from the edge function |
| RPC usage | `supabase.rpc("create_order", {...})` — single call, matches the function signature exactly (cross-checked against `pg_get_function_identity_arguments` this pass) |
| Transaction boundaries | The RPC body is one transaction; the edge function's slip-upload-then-RPC sequence is **not** itself transactional across the two steps (upload succeeds, RPC fails → explicit manual cleanup, not a DB transaction rollback) — expected for a mix of Storage + Postgres operations, since Storage isn't part of the Postgres transaction |
| Error rollback | RPC failure → exception → caught → slip removed → mapped/generic error returned. No partial `orders` row is left behind, since the `insert` and validations are inside the same function call that raises on failure (Postgres function bodies roll back atomically on unhandled exception) |
| Partial failure behavior | Covered above — the one identified gap is the crash-between-steps orphan case (P2), not a validation gap |
| Logging | `console.error` on products-lookup failure, slip-upload failure, and unmapped order-creation failure — these go to Supabase edge function logs (`get_logs service=edge-function`, not queried this pass — out of scope, no active incident to debug) |
| PII exposure | Customer PII (name/phone/email/address) passes through the function and into `create_order`'s arguments — normal for an order-creation endpoint; not separately logged in cleartext in the reviewed `console.error` calls (they log Supabase client error objects, not the customer payload) |

## Response behavior

| Item | Finding |
|---|---|
| Error sanitization | `mapOrderError` translates internal exception codes (`UNAVAILABLE:`, `OUT_OF_STOCK:`, `INVALID_ITEMS`) into customer-facing messages; anything unmapped falls through to a generic "Unable to submit your order right now" 500 — raw Postgres error text is never returned to the client |
| Status codes | 400 for validation/business-rule failures, 405 for wrong method, 500 for unexpected/unmapped failures — conventional and correct |
| Internal-error leakage | None found — `orderError.message` is only used internally by `mapOrderError`'s string-matching, never echoed verbatim to the client for unmapped cases |
| Returned order fields | `orderId` (code), `orderUuid`, `createdAt`, `subtotal`, `deliveryFee`, `total`, `currency`, `items` — no internal fields (e.g., raw Postgres error detail, service-role-derived data) leak |
| Retry safety | **Not safe**, per the idempotency finding above — a client-side retry (e.g., a double-submit from a flaky network) will create a duplicate order and double-decrement stock. This is the single most concrete, verifiable defect found in this audit. |

## Summary by severity

- **P1:** No idempotency/replay protection — duplicate submissions create duplicate orders and double-decrement stock. No application-level rate limiting on a fully anonymous, unauthenticated endpoint.
- **P2:** Orphan slip-object risk on mid-flight crash (no reconciliation job). Honeypot-only bot defense (no CAPTCHA). Request body size not explicitly capped in-function (relies on platform default).
- **Informational:** `verify_jwt=false` and wide-open CORS are both correct, intentional choices for this endpoint's threat model, not defects.
- **Verification gap:** signed-URL generation for admin slip viewing was not audited (out of scope this pass — lives in `AdminPage.tsx`, not re-read in full).

No P0 (immediately exploitable, severe) findings were identified. Per this task's operating rules,
none of the above were patched — they are reported for review and prioritization, not fixed.
