# 14 — Local Rebuild and Test Results

## Migration baseline status: **PARTIAL**

Not REPRODUCIBLE (a clean local database cannot currently rebuild the full remote schema from
files in this repo) and not fully BLOCKED (real, concrete progress was made this pass, and the
remaining blocker is narrow and specific).

### What changed this pass vs. the prior claim

The prior pass's `08-migration-risks.md` stated the Supabase CLI was "not installed" and treated
that as the blocker. Re-tested this pass:

```
$ npx --yes supabase --version
2.111.0                                    # exit 0 — CLI works fine via npx
$ npx --yes supabase projects list
{"_tag":"Error","error":{"code":"LegacyPlatformAuthRequiredError",
 "message":"Access token not provided. Supply an access token by running
 `supabase login` or setting the SUPABASE_ACCESS_TOKEN environment variable."}}
$ env | grep SUPABASE
(no output — not set)
$ docker --version
(eval):1: command not found: docker
```

**Corrected root cause: authentication and container runtime, not CLI absence.**

1. **`supabase login`** opens an interactive browser OAuth flow. This agent has no way to complete
   an interactive browser login inside this session. This blocks `supabase link` /
   `supabase db pull`, which both require an authenticated session against the Supabase management
   API.
2. **No Docker/container runtime** is available in this environment. `supabase start` (which spins
   up local Postgres + auth + storage containers) and therefore `supabase db reset` /
   `supabase test db` cannot run here even if authentication were solved.

Neither of these was attempted destructively — no `supabase link` was run (it would fail cleanly
on the auth error above, and was not force-attempted with fabricated credentials), and nothing was
pushed or reset against the remote project.

### What IS reproducible right now, and how it was verified without the CLI

Since `db pull`/`db reset` are blocked, this pass instead reconstructed the **verifiable end-state**
directly via `execute_sql` introspection (read-only) — schemas, tables, columns, constraints, RLS
policies, grants, function bodies, and triggers were all pulled and cross-checked (see
10-foundation-verification.md and 12-rls-and-authorization-audit.md). This is evidence of *what the
remote schema currently is*, not a locally-executable, git-versioned reproduction of *how to build
it from scratch* — the distinction the task explicitly asked to preserve. The 2 new migrations from
the prior pass ARE captured as local files (with the one filename-mismatch caveat in
08-migration-risks.md, Risk 5); the original 3 migrations are still not captured as files anywhere
in this repository.

### To fully close this gap (not done in this pass — requires user action)

1. Either the user runs `supabase login` interactively themselves (can be done via the `!`-prefixed
   shell-passthrough available in this CLI, since it opens a browser) and hands off an authenticated
   environment, **or** provides a `SUPABASE_ACCESS_TOKEN` value directly (would need to be handled
   as a secret, not pasted into chat/logs).
2. Install Docker (or another supported local Postgres container runtime) in this environment.
3. Then: `supabase link --project-ref jguewximloxmbhpsoxjb`, `supabase db pull` (backfills the 3
   original migrations as real files from actual remote history — not fabricated), `supabase start`,
   `supabase db reset`, `supabase test db`.

## Required tests (Phase 10) — status

**None of the following were executed.** No pgTAP test in this repository has ever run against a
real database, local or remote, in any session including this one. Executing them requires either
the local stack (blocked, see above) or applying `pgtap` as an extension to the remote project and
running assertions there — the latter would be a DDL/extension change to the remote database,
which the safety rules for this task explicitly freeze pending environment classification (see
13-environment-classification.md, currently UNKNOWN). Listed here as NOT EXECUTED, not as
PASS/FAIL, since no attempt was made:

| Test | Status |
|---|---|
| Anonymous user cannot read profiles | NOT EXECUTED — logically implied by the verified grant/RLS state (10, 12), not behaviorally tested |
| Authenticated User A can read own profile | NOT EXECUTED — no real `auth.users` row exists to test with |
| User A cannot read User B's profile | NOT EXECUTED — same reason |
| User A can update allowed own fields | NOT EXECUTED |
| User A cannot update User B | NOT EXECUTED |
| User A cannot modify `id` | NOT EXECUTED — grant-level block verified statically (10), not behaviorally |
| User A cannot directly modify `email` | NOT EXECUTED — grant-level block verified statically |
| User A cannot directly control `updated_at` | NOT EXECUTED — grant exists but trigger overrides it, see 10 for the nuance; not behaviorally confirmed |
| New Auth user receives exactly one profile | NOT EXECUTED — `on conflict do nothing` makes this structurally true, not behaviorally observed |
| Auth email update synchronizes correctly | NOT EXECUTED |
| Profile trigger failure behavior is observable | NOT EXECUTED |
| Customer cannot become admin through profile update | NOT EXECUTED — structurally true (`profiles` has no role/admin column at all to modify), not behaviorally probed |
| Client cannot modify `app_metadata` | NOT EXECUTED — `app_metadata` is a Supabase Auth server-managed field, not writable via the public client SDK by design (platform-level guarantee, not something this repo's code enforces or could break) — **[Inference]** based on documented Supabase Auth behavior, not independently tested this pass |
| `private.is_admin()` returns false for normal users | NOT EXECUTED behaviorally — verified statically via function body logic (12) |
| `private.is_admin()` returns true only for approved admin claim | NOT EXECUTED — same |
| Anon user does not pass the admin check | NOT EXECUTED behaviorally — verified statically (function returns `false` when `auth.jwt()` is null) |
| Function execution permissions are restricted | VERIFIED STATICALLY (12) — `create_order` EXECUTE is `service_role`/`postgres` only, confirmed via `information_schema.routine_privileges`, not a live-test but a direct grant check |
| Products/orders/settings/storage RLS (public read, admin write, cross-user denial) | NOT EXECUTED behaviorally — fully mapped statically in 12-rls-and-authorization-audit.md |

## Tests actually executed this pass (real commands, real output)

| Command | Result | Exit code | Evidence |
|---|---|---|---|
| `git status --short` / `git status` / `git diff` / `git diff --staged` | Executed | 0 | See 02-git-state section of final report |
| `npx tsc --noEmit` | PASS | 0 | No output |
| `npm run lint` (`eslint . && tsc --noEmit`) | PASS | 0 | No output |
| `npm run build` | PASS | 0 | Full Vite build succeeded; see 06-testing-and-ci-inventory.md for the generated-file-drift finding this run surfaced |
| `npx --yes supabase --version` | PASS | 0 | `2.111.0` |
| `npx --yes supabase projects list` | FAIL (expected/diagnostic) | 1 | `LegacyPlatformAuthRequiredError` |
| `docker --version` | FAIL | n/a | `command not found` |
| `mcp__supabase__get_advisors(type=security)` | PASS (0 lints) | n/a | Re-run this pass, unchanged from prior |
| Various `mcp__supabase__execute_sql` (read-only introspection) | PASS | n/a | Results embedded throughout 10/12; no DDL executed |

No destructive or write command was run against the remote project this pass — every
`execute_sql` call used this session was a `select`.

---

## Correction (2026-07-31, Foundation Closure pass)

### Phase 3 — CLI authentication: re-attempted, result unchanged in substance, error message more specific

```
$ npx --yes supabase login   (run in background, 6s timeout, no TTY attached)
{"_tag":"Error","error":{"code":"LegacyLoginMissingTokenError",
 "message":"Cannot use automatic login flow inside non-TTY environments. Please provide
 --token flag or set the SUPABASE_ACCESS_TOKEN environment variable."}}
```

**Supabase CLI authentication — BLOCKED.** This is a more specific error than the prior pass's
`LegacyPlatformAuthRequiredError` (which came from `projects list` on an already-unauthenticated
session): this one comes directly from `login` itself, explicitly confirming the CLI detected a
non-interactive (non-TTY) environment and refused to start the browser OAuth flow, rather than
hanging or silently failing. Two ways to unblock, both requiring action outside this agent's
capability:
1. The user runs `supabase login` themselves in their own interactive terminal (outside this
   session) and then supplies the resulting session to this environment somehow, or
2. The user generates a personal access token via the Supabase dashboard and sets it as
   `SUPABASE_ACCESS_TOKEN` in this environment (as an env var, never pasted into chat/logs — this
   agent will not request it be pasted as text).

No fabricated login success is reported. `link`, `db pull`, `db push`, and `migration list` (CLI
form, distinct from the MCP `list_migrations` tool which remains available and was used instead)
all remain blocked by this.

### Migration baseline status — revised

The filename/version mismatch documented in Risk 5 of 08-migration-risks.md **has been corrected**
this pass (local file renamed `20260731174521_...` → `20260731174630_...`, content unchanged, zero
remote effect — see that document for full verification). This removes one concrete correctness gap
from the local migration set, but does **not** change the underlying REPRODUCIBLE/PARTIAL/BLOCKED
status: the original 3 migrations are still not captured as files anywhere in this repository, and
`db pull`/`db reset` remain blocked by the same CLI-auth and missing-Docker constraints documented
above. **Migration baseline status remains: PARTIAL.**
