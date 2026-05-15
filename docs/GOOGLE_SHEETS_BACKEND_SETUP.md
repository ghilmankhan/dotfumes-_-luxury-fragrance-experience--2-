# DOTFUMES Google Sheets Backend Setup

This guide configures a lightweight production-ready MVP backend using:
- Google Sheets as order database/dashboard
- Google Drive as payment slip storage
- Google Apps Script as API endpoint

No paid services are required.

## 1. Create Google Sheet
1. In Google Drive, create a new Google Sheet.
2. Name it `DOTFUMES Orders`.
3. Copy the Sheet ID from the URL:
   - `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`

## 2. Required Columns
Create row 1 with these exact headers (left to right):

1. Order ID
2. Created At
3. Customer Name
4. Phone
5. Email
6. City
7. Address
8. Products
9. Quantity Summary
10. Subtotal
11. Delivery Fee
12. Total
13. Payment Method
14. Slip File Name
15. Slip URL
16. Payment Status
17. Order Status
18. WhatsApp Message
19. Admin Notes

The Apps Script also auto-checks/fixes this header row if needed.

## 3. Create Drive Folder
1. Create a Google Drive folder, e.g. `DOTFUMES Payment Slips`.
2. Open folder and copy folder ID from URL:
   - `https://drive.google.com/drive/folders/<DRIVE_FOLDER_ID>`

## 4. Create Apps Script
1. Open [script.new](https://script.new).
2. Rename project to `DOTFUMES Order Web App`.
3. Replace `Code.gs` contents with:
   - [`apps-script/dotfumes-order-webapp.gs`](/Users/ghilmanislam360/Downloads/dotfumes-_-luxury-fragrance-experience%20(2)/apps-script/dotfumes-order-webapp.gs)
4. Save.

## 5. Set Script Properties
In Apps Script:
1. Go to **Project Settings**.
2. Under **Script properties**, add:

- `SHEET_ID` = your sheet id
- `DRIVE_FOLDER_ID` = your drive folder id
- `OWNER_EMAIL` = business email to receive order notifications
- `BUSINESS_WHATSAPP_NUMBER` = WhatsApp number in international format (digits only preferred)

Optional:
- `PUBLIC_FORM_TOKEN` = shared token for frontend validation
- `SHEET_NAME` = specific sheet tab name (if not first tab)

## 6. Deploy as Web App
1. Click **Deploy** → **New deployment**.
2. Select type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone** (or your allowed audience, depending on your checkout access model).
5. Deploy and copy Web App URL.

When you update script code later, redeploy a new version and update frontend URL if needed.

## 7. Add Endpoint URL to Frontend `.env`
Create/update local `.env` (not committed secrets):

```env
VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/XXXXXXXX/exec
VITE_ORDER_FORM_PUBLIC_TOKEN=your-shared-public-token
VITE_CLIENT_WHATSAPP_NUMBER=923001234567
VITE_CLIENT_ORDER_EMAIL=orders@dotfumes.com
VITE_BASE_URL=https://dotfumes.com
```

If `VITE_GOOGLE_APPS_SCRIPT_WEB_APP_URL` is empty, checkout uses local fallback mode only.

## 8. Test an Order
1. Start frontend and place a test order.
2. Use valid customer details.
3. Select payment method.
4. Upload JPG/PNG/WEBP/PDF slip under 5MB.
5. Submit checkout.
6. Verify:
   - Confirmation page shows order ID
   - Slip URL is a real Google Drive URL
   - Row appears in Google Sheet
   - Owner email notification is received
   - WhatsApp handoff link includes order details + slip URL

## 9. Known Limitations
- This is a lightweight Apps Script backend, not a full transactional commerce backend.
- No inventory locking/reservation.
- No payment gateway verification; payment status starts as `Pending Verification`.
- Drive file links are share-link based (`Anyone with link` view).
- Apps Script quotas/rate limits apply.
- Apps Script response headers are limited compared to full backend platforms.

## 10. When to Upgrade to Supabase/Firebase/Custom Backend
Upgrade when you need one or more of these:
- High order volume and queue/retry control
- Role-based admin access and audit logs
- Real auth/session security model
- Server-side WhatsApp API automation
- Server-side email templates/delivery tracking
- Payment gateway webhooks and reconciliation
- Advanced analytics/reporting and joins
- Reliable background jobs and scaling controls
