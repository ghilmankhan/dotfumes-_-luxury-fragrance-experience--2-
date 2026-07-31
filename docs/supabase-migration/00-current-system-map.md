# 00 — Current System Map

Verified by direct repository and Supabase MCP inspection on 2026-07-31, branch `supabase`.

## Critical finding first

**The premise this survey was commissioned under ("Google backend is still the operational
system; protect it; do not delete it") is already false in this branch.** Commit `8f484cf`
("feat: migrate order backend and admin auth to Supabase", already on `supabase` before this
task began) deleted `apps-script/dotfumes-order-webapp.gs` and `src/lib/googleSheetsBackend.ts`
outright, and rewrote `.env.example` to drop every Google/Sheets/Drive variable. There is no
dual-backend or fallback mode in the current tree.

- `apps-script/` — does not exist. [Verified: `ls apps-script/` → "No such file or directory"]
- `src/lib/googleSheetsBackend.ts` — does not exist. [Verified: same check]
- `grep -rli "google" src/` (excluding `src/generated/`) — only hits are `src/index.css` and
  `src/lib/skills/skillGuard.ts` (an unrelated skills-tooling file, not commerce backend).
- `.env.example` — contains only `VITE_CLIENT_WHATSAPP_NUMBER`, `VITE_CLIENT_ORDER_EMAIL`,
  `VITE_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. No Google vars.

This is not a request I am refusing — it means Phase A's "protect the Google backend" operating
rule has nothing left to protect, and Phase B's "foundation only, no product/order schema" premise
needs re-checking against what already exists remotely (see finding in 07-migration-risks.md /
09-foundation-decisions.md). I am proceeding with the survey as instructed, but flagging this
before any further write actions.

## Verified technology stack

| Layer | Value | Evidence |
|---|---|---|
| Frontend framework | React 19 (`react@^19.0.1`, `react-dom@^19.0.1`) | `package.json` |
| Build tool | Vite 6 (`vite@^6.4.2`), `@vitejs/plugin-react` | `package.json` |
| Package manager | npm (`package-lock.json` present) | repo root |
| Routing | `react-router-dom@^6.30.3` | `package.json` |
| State management | `zustand@^5.0.13` (`src/store/useProductCatalogStore.ts`) | `package.json`, `src/store/` |
| Styling | Tailwind CSS 4 (`tailwindcss@^4.1.14`, `@tailwindcss/vite`) | `package.json` |
| Backend client | `@supabase/supabase-js@2.111.0` | `package.json` |
| TypeScript | `~5.8.2`, config at `tsconfig.json` | repo root |
| Testing | Playwright (`@playwright/test@^1.60.0`), one spec: `tests/e2e/smoke.spec.ts` | repo root |
| Lint/format | ESLint 10 (`eslint.config.js`), Prettier 3 | `package.json` |
| CI | None found — `.github/` does not exist | `find .github` → empty |
| Deployment target | [Unverified] — no deploy config (Vercel/Netlify/etc.) found in repo root | — |

`npm run build` runs three local codegen tools first (`skill:compile`, `skill:compile-v2`,
`self-heal` under `tools/`) before `vite build`. These are unrelated to the Supabase migration —
part of a separate in-progress skills-tooling change set currently uncommitted on this branch
(see Git state below).

## Git and repository state

- Branch: `supabase`, tracking `origin/supabase`, up to date with remote.
- Uncommitted (modified, not staged): `.gitignore`, `skills-lock.json`,
  `src/generated/*.json` (5 files), `src/lib/skills/skillGuard.ts`,
  `tools/skill-compiler-v2/rules.ts`, `tools/skill-compiler-v2/skillMap.ts`.
- Untracked: `.claude/settings.json`, `.claude/skills/{impeccable,minimalist-ui,web-design-guidelines}/`,
  `.mcp.json`, `.superdesign/`, `.tmp/`, `PRODUCT.md`, `design-system/`, `skills.manifest.json`.
- None of the above touch commerce/backend code — they belong to a separate, unrelated
  skills-tooling/design-system thread. Left untouched per "no unrelated changes."
- Other local branches: `main`, `feat/luxury-ui-overhaul`, `codex/luxury-commerce-system` (also
  present as `+` in `git branch -a`, indicating a linked worktree — not inspected further, out of
  scope).
- Most recent commit: `8f484cf` "feat: migrate order backend and admin auth to Supabase" — the
  commit that performed the Google→Supabase cutover described above.
- No commit on this branch is a partial/interrupted Supabase-foundation attempt; `8f484cf` is a
  complete, single-commit cutover of checkout + admin auth.

## Verified Supabase project state (via Supabase MCP, project `jguewximloxmbhpsoxjb`)

- `public.products`, `public.orders`, `public.settings` — all exist, RLS enabled, non-empty
  (`products`: 5 rows, `settings`: 2 rows, `orders`: 0 rows).
- `storage.buckets`: 1 bucket. [From prior verified memory: `payment-slips`, private.]
- Edge Function `create-order`: ACTIVE, `verify_jwt=false`, version 2.
- Remote migration history (`list_migrations`): 3 migrations —
  `20260730181201_init_commerce_schema`, `20260730181213_payment_slips_bucket`,
  `20260730185111_harden_rls_and_atomic_order_creation`.
- **No local `supabase/` directory exists in the repository.** These 3 migrations exist only in
  the remote project's migration-history table, not as files in git. There is no
  `supabase/config.toml`, no `supabase/migrations/`, no `supabase/functions/`. See
  08-migration-risks.md.
- `auth.users`: 0 rows. No admin (or any) user has been created yet.
- Security advisors (`get_advisors type=security`): 0 lints returned — no known advisor findings
  at time of check.
- Supabase CLI: not installed locally (`supabase --version` → "command not found"). Local
  Supabase dev workflow (`supabase start`, `supabase db reset`, `supabase test db`) is
  **unavailable in this environment**; all remote-state verification above was done via MCP tools
  only.

## Correction (2026-07-31, correction pass)

**CONTRADICTED: "Supabase CLI: not installed locally."** Re-run this pass:
`npx --yes supabase --version` → `2.111.0`, exit 0. The CLI is available via `npx` without any
install step; the prior pass evidently tried a bare `supabase --version` (no global binary) and
did not try `npx supabase --version`. Corrected claim: **the CLI is present and runnable via
`npx`, but not authenticated** — `npx supabase projects list` → `LegacyPlatformAuthRequiredError:
Access token not provided`, and no `SUPABASE_ACCESS_TOKEN` is set in this environment's shell
(`env | grep SUPABASE` → empty). `supabase login` requires an interactive browser OAuth flow this
agent cannot complete headlessly. `docker --version` → `command not found`, so `supabase start`
(which needs a local Postgres container) is separately blocked regardless of auth. See
10-foundation-verification.md and 14-local-rebuild-and-test-results.md for the full corrected
migration-baseline status.

**New finding, not in the original pass:** `git branch -vv` shows a linked worktree —
`+ codex/luxury-commerce-system 91f6953 (/private/tmp/dotfumes-luxury-commerce)` — and `origin/main`
has moved to `a58f686` ("feat: self-healing CMS OS + architecture enforcement system"), ahead of
what this branch's `main` ref shows locally. Neither is touched by this task; noted for
completeness since git state was re-verified this pass.
