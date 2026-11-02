# Dotfumes Supabase setup

The website remains unchanged until `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured. When both are present, Supabase becomes the catalog and order source; Google Sheets catalog and order submission are not used. Do not set these variables until the steps below are complete.

1. Create a Supabase project under the business-owned account. Save the database password in a password manager. Do not put it in this repository.
2. Run the SQL files in `supabase/migrations` in filename order in the Supabase SQL editor. Review the SQL before applying it.
3. In Supabase Authentication, create the intended admin user and confirm its email. Copy that user's UUID, then run this statement in the SQL editor, replacing the placeholder with the UUID: `insert into public.admin_users(user_id) values ('ADMIN_USER_UUID');`. Never put an admin password or a service role key in a `VITE_` variable.
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as local environment variables for the one-time seed command. Run `npx tsx scripts/seed-supabase.ts`. The seed upserts only the five current products and preserves their existing IDs and local image paths. It will overwrite those five rows if run again; use only before editing them in admin.
5. The guest checkout function is included as source at `supabase/functions/submit-order`, but it has **not been deployed**. The current business owner asked to defer deployment. The Supabase checkout stays paused (`VITE_GUEST_ORDERS_ENABLED=false`) until migration `202611020006_cash_on_delivery.sql` is applied, the function is reviewed and deployed with JWT verification disabled, rate limiting is added, and end-to-end Cash on Delivery and online order tests pass. Online methods additionally require official receiving account details. The function holds the service role key in Supabase's server-side secrets and must never expose it to Vite.
6. Set only the project URL and **publishable** key in the hosting environment as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Rebuild the frontend. Open `/admin` and sign in with the admin user.
7. Before launch, test a hidden product, new product, image upload, duplicate SKU/slug rejection, checkout at stock boundary, invalid slip, private slip access, payment verification, mobile UI, and rollback. Verify the deployed Edge Function and database policies with a non-admin account.

Do not configure Supabase on the public website before the database, admin user, seed, Edge Function, and checkout tests are complete. The old Apps Script admin screen remains available only when Supabase is not configured.

## Run this repository locally after pulling from GitHub

1. Install dependencies with `npm install` and copy `.env.example` to `.env.local`.
2. Ask the Supabase project owner for the project URL and **publishable** key, or obtain them from the project's API Keys page if you have authorized access. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in your own `.env.local`. Do not share or commit this file. A service-role key is not needed to run the website.
3. Run `npm run dev`, then open the local address printed by Vite (normally `http://localhost:3000`). Admin login is at `/admin`; there is no public navigation link to it. Only a user in `admin_users` can manage products, orders, and payment accounts.

The shared Supabase project already has the five current products and migrations through `202611020005_public_catalog_policy.sql`. The Cash on Delivery migration `202611020006_cash_on_delivery.sql` is in the repository but has **not** been applied to the shared project yet. Do not rerun the seed against that project after an admin has edited products. The current prices are shown as PKR using the original numeric amounts. Payment account slots are intentionally inactive until official receiving details are entered in the admin panel. A local clone without the two public Supabase variables falls back to the repository's local catalog and Apps Script configuration.
