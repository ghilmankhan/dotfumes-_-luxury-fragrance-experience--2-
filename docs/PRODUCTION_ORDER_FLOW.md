# DOTFUMES Production Order Flow (Phase 2)

This document defines what works today, what is still frontend-only, and the safest path to production-grade order infrastructure.

## 1. Current Truth (as of frontend Phase 2)

The checkout experience supports two real modes:

- `google-sheets` mode (if `VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL` is configured)
  - Frontend sends order payload + slip file to Apps Script.
  - Apps Script stores order row in Google Sheets.
  - Apps Script stores slip file in Google Drive.
  - Apps Script can notify owner email.
- `frontend-fallback` mode (if endpoint is missing)
  - Order is prepared locally only.
  - Slip preview remains local on the customer device.
  - Customer must send order via prefilled WhatsApp/email handoff.

The website does **not** claim server automation unless endpoint mode is active.

## 2. Frontend Modules and Boundaries

- Order payload builder: `/src/lib/order.ts`
- Slip validation: `/src/lib/validation.ts`
- Slip preview utilities: `/src/lib/paymentSlip.ts`
- Submission contract + services: `/src/services/orderSubmissionService.ts`
- Google Apps Script client: `/src/lib/googleSheetsBackend.ts`
- Latest order persistence (session): `/src/lib/storage.ts`

### Submission service interface

`OrderSubmissionService` isolates UI from transport details:

- `FrontendOnlyOrderService` for local handoff mode
- `GoogleSheetsOrderService` for Apps Script mode
- `BackendOrderService` placeholder for future managed backend

## 3. Backend Options

## Option A: Minimum Manual MVP

Flow:
- Frontend builds order payload
- Customer opens WhatsApp prefilled message and presses send
- Team verifies payment manually

Pros:
- Fastest and cheapest
- No infra maintenance

Cons:
- No reliable order database
- No hosted slip archive
- High manual workload

Cost/complexity:
- Cost: near zero
- Complexity: very low

Required files/modules:
- Keep current fallback services
- No backend integration required

Required env vars:
- `VITE_CLIENT_WHATSAPP_NUMBER`
- `VITE_CLIENT_ORDER_EMAIL`
- `VITE_BASE_URL`

## Option B: Low-cost Semi-Automated MVP

Flow:
- Frontend uploads slip + order to Apps Script (or Supabase)
- Slip stored in managed storage
- Orders stored in table/sheet
- Email notification via function/script
- WhatsApp remains manual prefilled link

Pros:
- Real order record
- Real slip URLs
- Minimal monthly cost

Cons:
- Light ops responsibility
- Limited observability and retries

Cost/complexity:
- Cost: low
- Complexity: low to medium

Required files/modules to change:
- `src/services/orderSubmissionService.ts` (service selection)
- `src/lib/googleSheetsBackend.ts` or new Supabase client module
- `src/models/order.ts` for backend response fields

Required env vars (Google Sheets path):
- `VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL`
- `VITE_ORDER_FORM_PUBLIC_TOKEN`

Possible env vars (Supabase path):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ORDER_API_URL` (if using edge/serverless function)

## Option C: Professional MVP

Flow:
- Orders written to database (Supabase/Firebase)
- Slips uploaded to cloud storage (Supabase/Cloudinary)
- Serverless email provider (Resend/Postmark/SES)
- Optional WhatsApp Business Cloud API send
- Basic admin dashboard for verification states

Pros:
- Reliable persistence and querying
- Better observability and retry controls
- Scalable support workflow

Cons:
- Higher implementation and maintenance overhead
- More environment and secret management

Cost/complexity:
- Cost: medium
- Complexity: medium to high

Required files/modules to change:
- Add backend adapter implementing `BackendOrderService`
- Add secure server function for upload + email + status updates
- Add admin state model (`paymentStatus`, `orderStatus`, notes)

Required env vars (frontend-safe only):
- `VITE_ORDER_API_URL`
- `VITE_STORAGE_PUBLIC_BASE_URL`

Server-only secrets (must not be in frontend):
- Database service keys
- Storage write keys
- Email provider API keys
- WhatsApp API token/secret

## 4. Security and Reliability Notes

- Keep anti-spam honeypot active.
- Continue limiting slip file types (`jpg`, `jpeg`, `png`, `webp`, `pdf`) and max size.
- Do not expose owner credentials or service-role keys in `VITE_*` vars.
- Keep checkout and confirmation pages `noindex,nofollow`.
- Keep clear customer copy that handoff may require a manual "send" action.

## 5. Upgrade Trigger Points

Upgrade beyond Apps Script when any of these happens:

- Order volume needs retries/queues
- Team needs searchable order history with filters
- You require strict auth and role-based admin controls
- You need automated payment verification or shipment events
- You need analytics-grade reliability and audit trails
