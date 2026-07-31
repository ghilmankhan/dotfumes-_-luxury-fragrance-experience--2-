# 01 — Google Backend Map

## Verified: no Google backend code remains in this branch

Direct inspection (2026-07-31, branch `supabase`):

- `apps-script/dotfumes-order-webapp.gs` — does not exist (deleted in commit `8f484cf`, per
  `git show --stat 8f484cf`, which lists it as removed, 1428 lines).
- `src/lib/googleSheetsBackend.ts` — does not exist (deleted in the same commit, 257 lines).
- `grep -rli "google\|script\.google\.com\|apps.script\|googlesheets" src/` (excluding
  `src/generated/`) returns only `src/index.css` and `src/lib/skills/skillGuard.ts` — neither is
  commerce-related. I did not open `src/index.css` further since a CSS file cannot contain a
  live Apps Script integration; this is reported as an unverified residual string match, not a
  functional dependency.
- No `doGet`/`doPost`/`FormData`-to-Apps-Script pattern found anywhere in `src/`.
- `.env.example` has zero Google/Sheets/Drive/WhatsApp-API/email-service variables.

**Correction (2026-07-31, correction pass):** the statement above — that reconstructing the
deleted Apps Script source was "out of scope" — was itself a survey gap, not a real constraint.
Deleted blobs remain reachable through git history as long as the commit that removed them is
reachable, which `8f484cf` is (`HEAD`). This pass reconstructs it directly:

```
git show --stat 8f484cf        # confirms 8f484cf deleted the files, 1428 + 257 lines
git rev-parse 8f484cf^          # 60c08521f0053f8e3e73d8a6a1a0374f53faa7dd
git show 8f484cf^:apps-script/dotfumes-order-webapp.gs   # full 1428-line source, recovered
git show 8f484cf^:src/lib/googleSheetsBackend.ts         # full 257-line source, recovered
```

Both files were read in full (or via targeted `grep`/`Read` on the recovered text) this pass.
Nothing was written back to the working tree or restored to the repo — this was read-only
inspection of git history, consistent with "do not modify old Google code."

## Reconstructed Apps Script backend (verified via `git show 8f484cf^:...`)

### Endpoints (`doGet`, `doPost`)

**`doGet(e)`** — query-param `action`-routed, four actions:
| Action | Auth | Purpose |
|---|---|---|
| `dashboard` | `assertAdminToken_` (query param `adminToken` or `token` must equal script property `ADMIN_READ_TOKEN`) | Aggregated admin metrics (`buildDashboardPayload_`) |
| `orders` | Same admin-token check | All order rows (`readOrders_`) |
| `products` | **None — public** | Product catalog + resolved settings |
| `settings` | **None — public** | Raw + resolved settings sheet |
| (missing/unknown) | — | `responseErrorForGet_('Unsupported action: ...')` |

Admin auth (`assertAdminToken_`, line 285) is a **shared-secret query-string token**, not a login
session — the token is compared with `!==` (not constant-time) against `ADMIN_READ_TOKEN`. If
`ADMIN_READ_TOKEN` was ever unset, the function throws rather than failing open (safe default).
CORS is not explicitly configured in the recovered source — Apps Script web-app responses under
`ContentService`/`HtmlService` are unauthenticated-CORS by platform default when deployed
"Execute as: Me / Who has access: Anyone"; the exact deployment access level itself is
**[Unverified]** — it is a Google Cloud project setting, not something recorded in this source
file.

**`doPost(e)`** (line 122) — single action: order submission.
- Parses payload from `e.parameter.payload` or `e.postData.contents` (`parseIncomingPayload_`).
- `validatePayload_` (line 1018): honeypot field must be empty (silently rejects if filled — same
  anti-bot pattern the current `create-order` edge function still uses); optional
  `PUBLIC_FORM_TOKEN` shared-secret compared against `payload.token`; requires
  `customerName`/`phone`/`city`/`address`/`paymentMethod`; requires ≥1 product line with a name
  and quantity > 0; requires a slip (`fileName`/`mimeType`/`base64`), MIME type in an allow-list
  (`jpeg`/`png`/`webp`/`pdf`), file size 1 byte–5 MB.
- Product/stock validation happens against the live **Products** sheet
  (`validateOrderProductsAgainstSheet_`, `findMatchingProductRowIndex_`) — matched by product
  name/quantity text parsing (`extractProductQuantities_`, `parseQuantityText_`), not a stable ID
  — a materially weaker match than the current `create_order` Postgres function's `slug`-keyed,
  row-locked (`for update`) lookup.
- Stock decrement (`applyStockDecrementPlan_`, line 660) uses `LockService`
  (script-level lock, inferred from the `stockLock` variable in `doPost` — not fully traced) as
  its concurrency guard, a materially weaker mechanism than Postgres row-level locking
  (`select ... for update`) used by the current `create_order` function.
- On success: appends a row to the **Orders** sheet (`saveOrderRow_`), uploads the slip to Drive
  (`uploadSlipFile_`), and — [Inference, not fully traced this pass] — sends owner/customer
  notifications (`sendOwnerNotification_`, `sendCustomerConfirmation_`, both present at lines
  1169/1191 but their call sites within `doPost` were not individually re-verified).

### Google Sheet tabs (verified column constants, lines 21–68)

| Sheet | Required columns (verified from source constants) |
|---|---|
| **Orders** (`ORDER_COLUMNS`) | `Order ID, Created At, Customer Name, Phone, Email, City, Address, Products, Quantity Summary, Subtotal, Delivery Fee, Total, Payment Method, Slip File Name, Slip URL, Payment Status, Order Status, WhatsApp Message, Admin Notes` |
| **Products** (`PRODUCTS_COLUMNS_REQUIRED`) | `Product ID, Slug, Name, Price, Stock, Active, Category, Short Description, Top Notes, Heart Notes, Base Notes, Tagline, Gender/Positioning, Updated At` |
| **Settings** (`SETTINGS_COLUMNS_REQUIRED`) | `Key, Value, Description` |

Sheet names are overridable via script properties (`ORDERS_SHEET_NAME`, `PRODUCTS_SHEET_NAME`,
`SETTINGS_SHEET_NAME`, default `Orders`/`Products`/`Settings`). `Payment Status`/`Order Status`
are free-text sheet cells normalized by `normalizeStatus_` — no enum/data-validation constraint
was found in the recovered `.gs` source (Sheets-side data validation, if any, would live in the
spreadsheet itself, which is external and **[Unverified]** — not part of this repo).

### Google Drive behavior (`uploadSlipFile_`, line 1093)

```js
file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
```

**Verified finding:** every uploaded payment slip was set to **"Anyone with the link can view"**
— not owner-only, not domain-restricted. Filename is `${orderId}-${originalFileName}`
(`uploadSlipFile_` blob naming). This means slip confidentiality depended entirely on the Drive
file ID being unguessable (a UUID-derived order ID prefix), not on an access-control check —
materially weaker than the current Supabase setup, where `payment-slips` is a **private** bucket
(`public: false`, verified via `storage.buckets`) with RLS policies restricting reads to
`private.is_admin()`. This is a real, verifiable improvement in the migration, not an assumption.

### Order lifecycle (reconstructed)

```
Frontend (googleSheetsBackend.ts submitOrderToGoogleSheets)
  → FormData POST to Apps Script Web App URL (payload as base64-inlined JSON)
  → doPost: honeypot + token check → validatePayload_
  → validateOrderProductsAgainstSheet_ (name-matched, not slug-keyed)
  → applyStockDecrementPlan_ (LockService-guarded sheet write)
  → uploadSlipFile_ (Drive, ANYONE_WITH_LINK)
  → saveOrderRow_ (Orders sheet append)
  → sendOwnerNotification_ / sendCustomerConfirmation_ (email; WhatsApp via buildWhatsAppUrl_
    deep-link, not an API send)
  → responseSuccess_ back to frontend
Admin retrieval: doGet?action=dashboard|orders with adminToken query param, no session concept.
```

### Migration implications

- The `slug`-keyed, row-locked stock/price authority in `public.create_order` (Postgres) is
  **strictly stronger** than the sheet's name-matched, `LockService`-guarded equivalent — this is
  a verified improvement, not a regression, and should be stated as such rather than left
  unaddressed.
- The private Storage bucket for slips is a verified improvement over `ANYONE_WITH_LINK` Drive
  sharing.
- The admin model changed from a **shared static token in a URL query string** (`ADMIN_READ_TOKEN`)
  to a **Supabase Auth session + JWT claim** (`app_metadata.role`) — also a verified improvement
  (no long-lived bearer secret pasted into URLs/browser history).
- No historical Sheets/Drive data was migrated (see 09, decisions 10–11) — the field mapping below
  is structural (schema-to-schema), not a record of an actual data migration that occurred.

## What replaced it (verified, current)

| Old Google integration point | Current Supabase replacement | Evidence |
|---|---|---|
| Apps Script `doPost` order submission | Edge Function `create-order` (ACTIVE, `verify_jwt=false`) | `mcp__supabase__list_edge_functions`; called from `src/lib/supabaseBackend.ts:160` |
| Google Sheets product/stock read | `public.products` table via `supabase.from('products').select(...)` | `src/lib/supabaseBackend.ts:98-113` |
| Google Sheets settings read | `public.settings` table, `key='checkout'` row | `src/lib/supabaseBackend.ts:106` |
| Google Drive payment-slip upload | Private `payment-slips` Storage bucket (base64 payload sent to the edge function, not a direct client upload) | `src/lib/supabaseBackend.ts:158-182`; bucket existence via prior verified project inspection |
| Apps Script admin token / `VITE_ADMIN_PASSWORD` | Supabase Auth session + `app_metadata.role === 'admin'` | `src/pages/AdminPage.tsx:47-48` (`isAdminSession`) |
| Formula-injection protection (Sheets-specific risk) | N/A — moot, no Sheets writes occur anymore | — |

There is no fallback/dual-mode switch in the current code: `isSupabaseBackendEnabled()`
(`src/lib/supabaseClient.ts:6-7`) gates whether the app can function at all —
`createOrderSubmissionService` throws if Supabase env vars are absent
(`src/services/orderSubmissionService.ts:92-96`). There is no code path that falls back to Google
Sheets if Supabase is unreachable.

## Migration impact

None pending on the Google side — that migration already happened. Remaining impact is entirely
on the Supabase side: formalizing what was pushed directly to the remote project into version
control (see 08-migration-risks.md).
