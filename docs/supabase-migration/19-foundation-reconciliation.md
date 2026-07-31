# 19 — Foundation Reconciliation

Produced by the Foundation Evidence Reconciliation and Design Hardening pass (2026-08-01). This
document treats the prior "Foundation Closure" final report as a claim set, not evidence, and
records what direct re-inspection of the actual repository files found, corrected, and hardened.

## Phase 1 — Actual file verification

All paths below were opened directly with `Read` this pass, not assumed from the prior report.

| File | Exists | Tracked in git | Content matches prior report | Problems found | Correction |
|---|---|---|---|---|---|
| `.github/workflows/verify.yml` | Yes | **No** (`git ls-files .github` → empty) | Yes, content matched | `database` job ran on every `pull_request`/`push` with no gate, despite only 2/5 migrations existing locally — a required-looking check that would fail by design | **Fixed this pass**: `database` job now `if: github.event_name == 'workflow_dispatch'` only |
| `supabase/config.toml` | Yes | No (`git ls-files supabase` → empty) | Yes (single `project_id` line) | None | None needed |
| `supabase/seed.sql` | Yes | No | Yes | None | None needed |
| `supabase/migrations/20260731174520_add_profiles_foundation.sql` | Yes | No | Yes | None | None needed |
| `supabase/migrations/20260731174630_revoke_anon_grants_on_profiles.sql` | Yes | No | Yes — content is `revoke all on public.profiles from anon;`, filename correctly matches remote `list_migrations` version | None | None needed |
| `supabase/tests/foundation_profiles_rls.test.sql` | Yes | No | Yes — `plan(17)` matches 17 counted assertions | Never executed (unchanged, expected — no local stack) | None needed beyond existing "not executed" framing |
| `supabase/tests/authorization_is_admin.test.sql` | Yes | No | Yes — `plan(8)` matches 8 counted assertions | Never executed | None needed |
| `supabase/tests/existing_tables_rls.test.sql` | Yes | No | Yes — `plan(10)` matches 10 counted assertions | Never executed | None needed |
| `src/lib/database.types.ts` | Yes | **No — untracked, new file** | Matches live schema per prior introspection | None found this pass | None needed |
| `src/lib/supabaseClient.ts` | Yes | Yes, tracked, but **modified, unstaged** (`git diff` shows a real working-tree change: `SupabaseClient<Database>` typing, import of `./database.types`) | Consistent with 10-foundation-verification.md's description | None found this pass | None needed |

**Overarching Phase 1 finding, not previously stated this precisely: the entire `supabase/`,
`.github/`, and `docs/supabase-migration/` directory trees are untracked in git** (`git status
--short`: `??` for all three, confirmed via `git ls-files` returning empty for each). This is not a
contradiction of any specific prior claim, but the prior final report's framing ("files created")
did not clearly foreground that none of this work is committed, staged, or would survive a
`git clean`/branch operation. Recorded here as a standing operational risk, not fixed in this pass
(committing is a user decision — this pass does not stage or commit anything per its own
instructions).

## Phase 2/3/4/5/6/7/8 — Contradiction matrix

| # | Contradiction | Files containing the claim | Conflicting claim | Correct evidence-backed version | Files corrected |
|---|---|---|---|---|---|
| 1 | `create-order` audit found "no P0/P1 findings" | 05-security-findings.md | 11-edge-function-audit.md's own summary lists 2 P1s (missing idempotency, missing rate limiting) | 0 P0, 2 P1, 3 P2/informational — matches 11's own table | 05-security-findings.md |
| 2 | "No CI workflows" / "no backend/database tests" / "no `supabase/` directory at all" | 06-testing-and-ci-inventory.md | `.github/workflows/verify.yml`, `supabase/seed.sql`, and 3 pgTAP test files now exist on disk | They exist as files, are statically reviewed, are **untracked in git** and have **never run** (locally or in GitHub Actions) | 06-testing-and-ci-inventory.md, 08-migration-risks.md (Risk 4), 10-foundation-verification.md, 15-next-stage-readiness.md |
| 3 | Local migration file named `20260731174521_...` | 08-migration-risks.md (as historical "Risk 5"), 10-foundation-verification.md (as a live section heading) | File was renamed to `20260731174630_...` in the Foundation Closure pass to match `list_migrations` | Filename now correctly matches the remote-recorded version; 10's section heading was stale and has been corrected | 10-foundation-verification.md |
| 4 | Guest-ownership decision 1 recommends Option B (anonymous Auth); decision 2 says "do not enable anonymous auth" | 09-foundation-decisions.md | Read together, looked like two different answers to the same question | Reconciled: `Guest ownership: Open / Preferred candidate: Option B / Anonymous Auth enablement: Not approved` — decision 2's "do not enable" is about *today*, not a rejection of Option B as a future candidate | 09-foundation-decisions.md |
| 5 | Environment classification stated as "Development" (unqualified) | 09-foundation-decisions.md §16, 13-environment-classification.md | This task's required vocabulary only permits "Development" when user-confirmed; the user has not confirmed it | Corrected label: **Development Candidate — Awaiting User Confirmation** | 09-foundation-decisions.md, 13-environment-classification.md, 15-next-stage-readiness.md |
| 6 | MFA verification instructed reading `getSession().session.aal` | 16-first-owner-and-mfa-runbook.md (prior version) | Not verified against the installed SDK this pass or any prior pass; the documented, current API is `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` | Runbook now uses the documented API and explicitly flags the old field as unverified/not to be relied on | 16-first-owner-and-mfa-runbook.md |
| 7 | Offboarding/compromise-response steps claimed `app_metadata.role` changes are "an instant, authoritative revocation" | 16-first-owner-and-mfa-runbook.md (prior version, step 13) | Supabase Auth JWTs carry claims fixed at mint/refresh time — an already-issued token is not invalidated by a database-side `app_metadata` change alone | Both offboarding and compromised-account procedures now explicitly require session revocation via the Auth admin API as the step that actually ends current access | 16-first-owner-and-mfa-runbook.md |
| 8 | Idempotency table proposed in `public.idempotency_keys`, with `order_id` populated only on success | 17-order-idempotency-design.md (prior version) | No evidenced reason for Data API exposure; a `processing` row with no pre-stored `order_id` cannot be reconciled after a crash | Moved to `private.idempotency_keys`; `order_id` generated and stored at claim time, `not null` | 17-order-idempotency-design.md |
| 9 | Idempotency `failed → processing` retry used a plain, non-conditional `update` | 17-order-idempotency-design.md (prior version) | Two concurrent retries of a failed key could both "win" the update | Replaced with an atomic compare-and-swap (`where status = 'failed'`, rows-returned decides the winner) | 17-order-idempotency-design.md |
| 10 | Idempotency design claimed edge-function-level wrapping (separate RPC call + separate status update) closes the crash window | 17-order-idempotency-design.md (prior version) | A crash between RPC success and the status update leaves a committed order with a stuck `processing` row | Preferred design now wraps claim + order creation + completion in one Postgres transaction/function; documented trade-off against the reconciliation-only alternative | 17-order-idempotency-design.md |
| 11 | Idempotency retention silently defaulted to 24 hours | 17-order-idempotency-design.md (prior version) | No retry-window/support-window/cleanup/duplicate-risk/approval breakdown was given | Retention concerns separated explicitly; 7-day period recommended, marked **not approved** | 17-order-idempotency-design.md |
| 12 | Abuse-control rate limiter used a separate `select count(...)` then `insert` | 18-create-order-abuse-controls.md (prior version) | Classic TOCTOU race — concurrent requests can both read a pre-threshold count before either inserts | Replaced with one atomic `insert ... on conflict ... do update ... returning` fixed-window counter | 18-create-order-abuse-controls.md |
| 13 | Rate-limit table stored raw IP addresses and raw phone numbers | 18-create-order-abuse-controls.md (prior version) | Raw identifiers in a table are reversible/sensitive PII at rest | Replaced with a keyed HMAC using a server-only pepper (Edge Function secret); rotation implications documented | 18-create-order-abuse-controls.md |
| 14 | Per-phone hard limit with no targeted-denial mitigation | 18-create-order-abuse-controls.md (prior version) | A hard per-phone cap lets an attacker lock out a real customer by spamming with the victim's known phone number | Layered controls added: IP limit, IP+phone limit, higher-threshold phone-only limit that escalates to CAPTCHA rather than hard-rejecting | 18-create-order-abuse-controls.md |
| 15 | Body-size protection described as a single `Content-Length` check | 18-create-order-abuse-controls.md (prior version) | A `Content-Length` check alone does not cover missing-header, chunked-transfer, or post-decode-size cases | Expanded into a full table covering header presence, chunked transfer, platform maximum, base64-decoded size relationship, and JSON structural limits | 18-create-order-abuse-controls.md |
| 16 | CAPTCHA left as "add later if abuse is observed," no concrete policy | 18-create-order-abuse-controls.md (prior version) | No environment-scoped policy or escalation trigger was defined | Explicit Development/Preview/Production-launch/escalation policy table added | 18-create-order-abuse-controls.md |

## Phase 9 — Test and seed audit (static review only, per this task's own instruction not to call an unexecuted test "passing")

All three pgTAP files and `supabase/seed.sql` were read in full this pass.

| Checklist item | Result |
|---|---|
| `plan()` count matches assertion count | Yes, all 3 files (17/17, 8/8, 10/10 — counted directly) |
| Every test has cleanup | Yes — each file wraps its entire body in `begin; ... rollback;`, so all fixtures are discarded regardless of outcome |
| No production identifiers | Yes — fixed test UUIDs (`11111111-...`, etc.), `@test.local` emails, `test-*`/`seed-*` slugs |
| No real customer PII | Yes |
| No secrets | Yes — `encrypted_password` values are the literal string `'not-a-real-hash'`, not a real hash or credential |
| Auth fixtures are local-only | Documented in each file's header comment as local/test-database-only; consistent with how they're written (direct `auth.users` inserts as `postgres`, which bypasses RLS — a pattern only appropriate in a disposable test transaction) |
| Tests cannot run accidentally against remote | **Partial gap, newly flagged this pass:** nothing in the SQL itself technically prevents someone from pointing `psql`/`supabase db query` at the remote project and running one of these files — the "local-only" guarantee is currently a documentation comment, not a technical control (e.g., no `do $$ begin if current_database() !~ 'local' then raise exception ... end if; end $$;` guard). Low-severity given the required `on conflict`/direct-`auth.users`-insert pattern would fail differently against a populated remote database, but worth naming as a real, if narrow, gap. |
| RLS contexts changed correctly | Yes — consistent `set local role ...` / `set local "request.jwt.claims" to ...` pattern, reset appropriately between role switches |
| JWT claims reset between tests | Yes, `reset "request.jwt.claims"` called before each role switch that needs it |
| Administrator tests cannot leak state | Yes — contained within each file's own transaction/rollback |
| Storage tests clean created objects | Yes, via the same transaction rollback (no explicit `DELETE` needed) |
| Trigger tests actually prove behavior | Yes for the cases exercised (email sync on a changed value, `updated_at` override) |
| Email-sync test covers old and new values | **Gap, newly flagged this pass:** the test only exercises `new.email` differing from `old.email`; the trigger's `if new.email is distinct from old.email` guard on a same-value update is never exercised — not a defect in the trigger, a test-coverage gap |
| `updated_at` test proves client input is overwritten | Yes — sets a client value, confirms the stored value is recent instead |
| Tests deterministic | Yes — fixed UUIDs/data; the one wall-clock-relative assertion (`now() - updated_at < interval '1 minute'`) is not meaningfully flaky |
| Seed can be run repeatedly | Yes — both `insert` blocks use `on conflict (...) do nothing` |

**Execution status for all three files and the seed: Statically reviewed. Not run. Executable only
once a local Supabase stack exists (blocked — no Docker in this environment, unchanged from
14-local-rebuild-and-test-results.md).**

## Phase 10 — Stale-phrase sweep

| Phrase searched | Found in | Disposition |
|---|---|---|
| "Environment classification: UNKNOWN" | 13-environment-classification.md (original body), 15-next-stage-readiness.md (original body) | Preserved as historical text (both files' original sections are now explicitly marked "historical"/superseded); corrected current value stated in each file's correction section |
| "No CI workflows" | 06-testing-and-ci-inventory.md | Preserved as historical (predates the CI file's creation); correction section added directly below it |
| "No backend/database tests" | 06-testing-and-ci-inventory.md | Same as above |
| `20260731174521` | 08-migration-risks.md (historical, correctly labeled as such already), 10-foundation-verification.md (was a live section heading, not historical) | 08's usage was already correctly historical/labeled FIXED; 10's usage corrected to the current filename with an explicit note |
| "No P0/P1 findings" | 05-security-findings.md | Corrected in place (see contradiction #1 above) |
| "Seed strategy MISSING" | 10-foundation-verification.md | Corrected to reflect `supabase/seed.sql`'s existence (still untracked, still unapplied) |
| "Only 5 structural assertions" (paraphrased as "5 structural pgTAP assertions") | 10-foundation-verification.md | Corrected to the current 3-file, 35-assertion count |
| "CI proposed, not applied" | 15-next-stage-readiness.md | Preserved as historical (original section marked superseded); correction states the file now exists but is untracked/never executed |

## Summary of files corrected this pass

`05-security-findings.md`, `06-testing-and-ci-inventory.md`, `08-migration-risks.md`,
`09-foundation-decisions.md`, `10-foundation-verification.md`, `13-environment-classification.md`,
`15-next-stage-readiness.md`, `16-first-owner-and-mfa-runbook.md`,
`17-order-idempotency-design.md` (substantially revised), `18-create-order-abuse-controls.md`
(substantially revised), `.github/workflows/verify.yml` (database job gating fixed). This document
(`19-foundation-reconciliation.md`) is new.

No file under `.claude/`, `.superdesign/`, `.tmp/`, `design-system/`, `src/generated/`,
`src/lib/skills/`, `tools/skill-compiler-v2/`, `skills-lock.json`, or `skills.manifest.json` was
read, modified, staged, or committed this pass. No remote Supabase migration, Edge Function
deployment, administrator account, or Auth configuration change was made this pass — every
correction above is a local documentation or workflow-file edit.

---

## Correction (2026-08-01, Foundation Correction Commit and Local-Execution Preparation pass)

Everything above this line describes the Foundation Evidence Reconciliation pass specifically and is
kept as its historical record. Two further passes have since run — Foundation Artifact Preservation
(which committed the work described above into git, `3d63fdf`/`42df0bc`, without pushing) and this
one, which corrected additional defects found by direct re-reading of the actual files (not by
trusting this document or any other prior report as evidence, per this task's own verification
directive). Summary, cross-referenced to where each is described in full:

| Defect found this pass | Corrected in |
|---|---|
| `existing_tables_rls.test.sql` fixture referenced a nonexistent `customer_phone` column and omitted the required `address` column | The test file itself; see 08-migration-risks.md |
| `supabase/migrations/README.md` overstated what `supabase db pull` would prove about the 3 uncaptured original migrations | The README itself; see 08-migration-risks.md Risk 7 |
| `public.profiles` granted `update (updated_at)` to `authenticated`, broader than intended | New, not-yet-applied migration; see 08-migration-risks.md Risk 6 |
| Idempotency design: retry compare-and-swap could overwrite `request_hash`, `complete_order_for_claim` had no attempt-ownership guard, stale-processing recovery was a raw example rather than a real function, error mapping blindly mapped every `P0001` to `OUT_OF_STOCK` | 17-order-idempotency-design.md, substantially revised again |
| Abuse-control design: rate-limit key could collide across policies sharing a dimension, caller could supply arbitrary limits/windows | 18-create-order-abuse-controls.md, substantially revised again |
| CI used an unpinned CLI version and a misleadingly-named type-check step; database job had no real schema-vs-types comparison | `.github/workflows/verify.yml` |

This document is not further rewritten beyond this section — its Phase 1-10 content above remains
the historical record of the pass that produced it, per this project's established convention of
marking superseded sections rather than deleting them (see 15-next-stage-readiness.md for the same
pattern).
