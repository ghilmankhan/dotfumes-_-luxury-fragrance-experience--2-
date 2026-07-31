# 04 — Environment Variable Inventory

Verified via `.env.example`, `src/vite-env.d.ts`, `src/lib/config.ts`, and
`grep -rn "import\.meta\.env" src/` (excluding `src/generated/`). `.env` exists locally
(gitignored, `git check-ignore -v .env` → matched by `.gitignore:16 .env*`) and was **not opened**
— its contents were never read or printed, consistent with "do not print secret values."

| Variable | File references | Client-visible? | Purpose | Required | Supabase-era status | Security risk |
|---|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env.example`, `vite-env.d.ts`, `config.ts:30` | Yes (client-visible by Vite convention, and appropriately so — it's a public API host) | Supabase project API base URL | Yes — `isSupabaseBackendEnabled()` throws if absent | Current, in use | Low — this is meant to be public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.example`, `vite-env.d.ts`, `config.ts:31-34` | Yes | Public/publishable Supabase key for the browser client | Yes (or fallback below) | Current, in use | Low if it is genuinely the publishable key, not service_role — see note |
| `VITE_SUPABASE_ANON_KEY` | `vite-env.d.ts`, `config.ts:33` | Yes | Legacy-named fallback if `VITE_SUPABASE_PUBLISHABLE_KEY` unset (`firstNonEmpty`) | No | Kept for compatibility | Same as above |
| `VITE_CLIENT_WHATSAPP_NUMBER` | `.env.example`, `vite-env.d.ts`, `config.ts:19-27` | Yes | Business WhatsApp contact number shown/used in order messages | No — has a hardcoded fallback `923001234567` | Unrelated to Supabase migration | None — not a secret |
| `VITE_CLIENT_ORDER_EMAIL` | `.env.example`, `vite-env.d.ts`, `config.ts:20-28` | Yes | Business order-notification email address | No — fallback `orders@dotfumes.com` | Unrelated to Supabase migration | None — not a secret |
| `VITE_BASE_URL` | `.env.example`, `vite-env.d.ts`, `config.ts:29` | Yes | Public site base URL | No | Unrelated | None |

**I did not find any `SERVICE_ROLE`, `ADMIN`, `TOKEN`, `SCRIPT`, `DRIVE`, or `WHATSAPP`-API-key
variable anywhere in `.env.example`, `vite-env.d.ts`, or the grep of `src/`.** No evidence of a
service-role key being referenced from frontend code. The edge function
(`create-order`) is described as using "service-role writes" per prior verified project state
(memory) — meaning the service-role key lives only in the Edge Function's server-side runtime
environment (managed by Supabase, not present in this repo), which is the correct pattern. **I
did not independently re-verify the edge function's environment/secrets configuration this
pass** — flagged as unverified, not claimed as confirmed-safe.

## Verification note on the publishable key

I did not decode or inspect the actual value of `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` (file
not opened). Whether it is a genuine `sb_publishable_...` key vs. a legacy `anon` JWT was not
confirmed by inspecting the value — only that the code path (`config.ts:31-34`,
`.env.example` comment) is written with the intent of using the publishable/anon key, never
service_role. This is a code-intent verification, not a value verification.
