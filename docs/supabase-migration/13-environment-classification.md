# 13 — Environment Classification

## Evidence gathered (all checked this pass)

| Evidence source | Finding |
|---|---|
| Project name/ref | `jguewximloxmbhpsoxjb` (from `mcp__supabase__get_project_url` → `https://jguewximloxmbhpsoxjb.supabase.co`). No "staging"/"dev"/"prod" naming convention in the ref itself — Supabase project refs are opaque random strings, not descriptive. |
| Frontend deployment variables | `.env.example` documents `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` as placeholders (empty values) — the *actual* runtime values used by any deployed frontend are not in this repository (correctly gitignored — verified via `.gitignore` diff showing `.env*` excluded except `.env.example`). Cannot confirm which Supabase project a live deployment points at. |
| Deployment configuration | No Vercel/Netlify/Cloudflare Pages config file, no `vercel.json`, no `netlify.toml`, no `.github/workflows/*deploy*` found anywhere in the repo (`find` for these patterns returns nothing). |
| Live domain configuration | `VITE_BASE_URL=https://dotfumes.com` in `.env.example` — this is a **placeholder default value in an example file**, not proof that `dotfumes.com` is live, DNS-configured, or connected to this Supabase project. No DNS/hosting records are visible from a git repository. |
| README | No root `README.md` was found describing deployment/hosting (not checked exhaustively this pass — **[Unverified]** whether one exists with this content, but not found via the file listing observed). |
| Hosting settings in repo | None found. |
| Git branch usage | Branch is named `supabase`, tracking `origin/supabase`. `main` exists separately (`origin/main` at `a58f686`, unrelated feature work). Branch naming conventions are not a reliable signal of environment (per this task's own explicit instruction not to infer from branch name). |
| Supabase project metadata | No project-level "environment" tag or label is exposed by any MCP tool used this pass — `get_project_url` returns only the API URL. |
| Existing production-looking data | `products`: 5 rows — visually plausible as either seed/demo data or a small real catalog; no way to distinguish from schema alone. `orders`: 0 rows — no live order has ever been placed through this system. `auth.users`: 0 rows — no one, including an owner/admin, has ever signed in. **A project with zero real orders and zero real users is weak evidence against "actively serving production traffic today,"** but per this task's explicit instruction, this alone must not be used to *positively* conclude "development" either — a freshly-cut-over production system with no orders yet is also consistent with this state. |
| User-facing URL references | None resolvable from this repository — no way to `curl` or verify a live public site from available evidence without leaving the scope of repository/backend inspection. |

## Classification

**Environment classification: UNKNOWN.**

None of the available evidence sources (repo config, MCP introspection, git history) can establish
whether `jguewximloxmbhpsoxjb` is a development sandbox, a staging environment, or the live
production backend for a real, publicly reachable `dotfumes.com`. The zero `orders`/`auth.users`
row counts are suggestive of pre-launch or low-traffic state but are explicitly not sufficient
evidence per this task's own instruction against inferring production status from non-empty/empty
tables alone.

## Consequence

Per the safety rules for this task, **all remote modifications are treated as unsafe-until-
clarified** regardless of how "foundation-only" or additive they may seem. This applies equally to
the already-applied `profiles` migrations from the prior pass (already done, cannot be undone by
this classification, but is noted as a retroactive risk-acceptance point) and to any future
migration, including the P1 filename-correction recommended in 08-migration-risks.md — that
correction is a **local file rename only** and has zero remote effect, so it does not require
environment clarification to apply, but any actual DDL change does.

## What would resolve this

A direct statement from the user about: (a) whether `jguewximloxmbhpsoxjb` is the only Supabase
project for this business or one of several (dev/staging/prod), and (b) whether `dotfumes.com` (or
any other live domain) currently serves a build of this repository connected to this project. Until
then, this remains the single largest open gate on Floor 1 readiness (see
15-next-stage-readiness.md).

---

## Correction (2026-07-31, Foundation Closure pass) — Production ruled out with direct evidence

This pass located and inspected a live deployment pipeline the prior pass did not find. The
evidence below is direct (command output, HTTP responses, DNS lookups, and a fetched JS bundle),
not inferred.

### New evidence gathered

| Evidence source | Finding | Command |
|---|---|---|
| GitHub repo metadata | `homepageUrl: "https://dotfumes-luxury-fragrance-experienc.vercel.app"` — a Vercel project is connected to this GitHub repo | `gh repo view ... --json homepageUrl` |
| GitHub Deployments API | 13 deployments recorded, created by `vercel[bot]`, split across two GitHub "environment" labels: `Production` and `Preview` | `gh api repos/.../deployments` |
| Most recent `Production`-labeled deployment | `2026-07-14T19:45:27Z`, sha `a58f6863...` — this is `origin/main`'s current tip | Same |
| Most recent `Preview`-labeled deployment | `2026-07-30T20:44:40Z`, sha `8f484cf0...` — this is the **current `supabase` branch HEAD**, the Supabase-migration commit itself | Same |
| Every deployment of the Supabase-migration lineage (`8f484cf`, `8ab40fa`, `4727474`) | Labeled `Preview`, never `Production` | Same |
| Does `a58f686` (the last real Production deploy) contain Supabase code? | **No.** `git ls-tree -r a58f686 -- src/lib` shows `googleSheetsBackend.ts` present and no Supabase client file at all. `git merge-base a58f686 8f484cf` = `a58f686`, confirming it is a direct ancestor — the Supabase work was built on top of it, not merged back into what's live. | `git ls-tree`, `git merge-base` |
| `dotfumes.com` DNS | **Does not resolve.** `curl` fails with `Could not resolve host: dotfumes.com`; `dig` returns nothing. The domain referenced throughout `.env.example`/docs as the "live" domain currently has no DNS record reachable from this environment. | `dig`, `curl -v` |
| Vercel Preview URL for `8f484cf` (`.../7jxxivha2.vercel.app`) | Returns `HTTP 302` to `vercel.com/sso-api` — gated behind Vercel's Deployment Protection (SSO). Not publicly reachable; not inspected further (would require credentials this agent does not have and should not attempt to bypass). | `curl -sI` |
| Vercel canonical/production alias (`.../dotfumes-luxury-fragrance-experienc.vercel.app`, the `homepageUrl`) | Returns `HTTP 200`, publicly reachable, no SSO gate — consistent with this being the alias that always serves the latest **Production** deployment per Vercel's own routing model | `curl -sI` |
| Bundled JS served by that public canonical URL (`/assets/index-BTipcZC0.js`, fetched directly) | Contains the literal string `GOOGLE_APPS_SCRIPT`. Contains **zero** occurrences of `supabase` or `jguewximloxmbhpsoxjb`. | `curl` the JS asset, then `grep` |

### Interpretation

The publicly reachable production-alias deployment of this codebase is **verified, by direct
inspection of its own served JavaScript, to be running the pre-Supabase Google Apps Script/Sheets
backend** — not this Supabase project. This is consistent with, and now directly corroborates, the
git-history finding that the last `Production`-labeled deploy (`a58f686`) predates the Supabase
migration entirely. The Supabase-migration commit (`8f484cf`, current `supabase` branch HEAD) has
only ever reached Vercel's `Preview` environment, which is itself access-gated by Vercel SSO — i.e.
not publicly reachable, not serving real customers.

**`dotfumes.com` not resolving in DNS at all** means the "live public Dotfumes website" this task's
own Production definition refers to cannot currently be reached by that name from any client,
regardless of which backend it would use if it did resolve.

### Revised classification

**Production is ruled out by direct evidence:** no verified live, publicly reachable deployment of
this codebase uses `jguewximloxmbhpsoxjb`. The one public deployment that exists uses the old
Google Sheets backend.

Between **Development** and **Staging**, the evidence favors **Development**, but this specific
distinction is a business-process judgment this repository cannot fully resolve on its own:
- Favoring Development: zero rows in `orders`/`auth.users` (schema exists, never used by a real
  transaction or a real login); the only build wired to the Supabase branch reached Preview, not a
  dedicated staging alias/environment; no formal staging pipeline, staging Supabase project, or
  staging-specific config exists anywhere in the repo.
- Against a confident Development/Staging call either way: this agent could not get past Vercel's
  SSO gate on the Preview deployment, so it cannot directly confirm that Preview build's runtime
  environment variables actually point at `jguewximloxmbhpsoxjb` (as opposed to some other or no
  Supabase project) — that link is [Inference] from the fact that this is the only Supabase project
  referenced anywhere in the repository (`.mcp.json`, `supabase/config.toml`), not a directly
  observed runtime value.

**Revised classification: Development Candidate — Awaiting User Confirmation** (corrected
2026-08-01, Foundation Evidence Reconciliation pass — a prior draft of this line said
"Development" outright, which overstated the evidence; see below).

Evidence-supported facts, directly observed, not in question: Production is ruled out, and this
project is not currently serving live Staging traffic either. What is **not** independently
verified is the finer Development-vs-formal-Staging distinction itself — that is a
business-process judgment call the evidence here narrows but does not settle on its own. Per this
task's required classification vocabulary, this project must be labeled one of:

```text
Development — User Confirmed
Development Candidate — Awaiting User Confirmation
Staging — User Confirmed
Unknown
```

"Development" alone is not a valid label without the user's explicit confirmation — using it
unqualified in the prior pass was a wording error, not a re-assessment of the underlying evidence.
Until the user confirms, this project should be treated as **Development Candidate — Awaiting User
Confirmation**.

### Consequence of this correction

The blanket "all remote modifications unsafe until clarified" posture from the original UNKNOWN
classification is **downgraded, not lifted**: Production is now excluded with direct evidence,
which removes the single most severe risk (accidentally shipping a schema/data change to real
customers). It does not by itself authorize unrestricted remote changes — the task's own Phase 6
staging-strategy rules still apply, and any actual remote DDL still requires the explicit approval
step this task's safety rules require regardless of environment label.
