<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Dotfumes

Cinematic luxury fragrance commerce built with React, Vite, and Tailwind CSS.

## Run Locally

**Prerequisites:** Node.js and npm.

```bash
git clone https://github.com/ghilmankhan/dotfumes-_-luxury-fragrance-experience--2-.git
cd dotfumes-_-luxury-fragrance-experience--2-
npm ci
npm run dev:site
```

Open `http://localhost:3000`. This starts a local preview of the current products without any account setup.

To review the shared Supabase catalog and admin panel, copy `.env.example` to `.env.local`, then fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Dotfumes Supabase project's API Keys page. Restart the server after saving the file. The admin login is at `http://localhost:3000/admin`; only an authorized Dotfumes admin account can sign in. Never commit `.env.local` or a service-role key.

See [Supabase setup](docs/SUPABASE_SETUP.md) for migration and checkout details. The shared Dotfumes project accepts Cash on Delivery, NayaPay and Bank Alfalah order requests. Easypaisa and JazzCash remain configurable in admin and hidden from customers until enabled. A public website deployment needs the same three `VITE_SUPABASE_*`/`VITE_GUEST_ORDERS_ENABLED` values configured in its build environment.

## Netlify

`netlify.toml` builds the Vite app into `dist` and serves React Router pages such as `/admin` on refresh. In the Netlify site environment, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_GUEST_ORDERS_ENABLED=true` before a cloud build. Set `VITE_BASE_URL` to the final site URL for canonical links. Use only the publishable Supabase key in a `VITE_` variable; never store a service-role key or admin password in the frontend build.
