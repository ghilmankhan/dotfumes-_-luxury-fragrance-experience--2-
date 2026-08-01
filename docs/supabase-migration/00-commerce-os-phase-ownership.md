# 00 — Commerce OS Phase Ownership

**Status: abbreviated, working phase-ownership reference.** This document preserves the
authoritative phase boundaries relevant to current work. It is **not** a claim that the complete,
original Dotfumes Supabase Commerce OS implementation program (with its full objective/tests/exit-
criteria detail for every floor) exists in or is reproduced by this repository. This file exists
because prior verification passes needed a durable, version-controlled place to point at instead of
re-deriving phase boundaries from scratch each time; if the complete original program document is
ever located, it — not this file — is authoritative, and this file should be reconciled against it.

Definitions below were supplied directly by the user as authoritative for this repository's current
verification work (2026-08-01).

## BASE — Supabase Foundation

The Base includes:

- local, staging and production environment structure;
- migration workflow;
- public/private/audit schema strategy;
- authentication;
- profiles;
- `user_roles`;
- roles including customer, support, inventory manager, payment reviewer, admin and owner;
- controlled role grant/revoke operations;
- administrator MFA readiness;
- default-deny RLS;
- reusable authorization helpers;
- generated TypeScript database types;
- environment-variable documentation;
- local reproducibility from migrations.

**Base exit criteria:**

- local database starts successfully from migrations;
- staging database deploys successfully;
- authentication works;
- roles work;
- baseline RLS tests pass;
- frontend connects to staging without privileged credentials.

## FLOOR 1 — Product Catalog and Inventory

Floor 1 introduces the future structured catalog:

- categories;
- products;
- product variants;
- images;
- product-category relationships;
- inventory movements;
- inventory reservations;
- catalog read views;
- Supabase-backed storefront catalog.

A single local compatibility fixture row in the existing legacy `public.products` table is not
Floor 1 implementation.

## FLOOR 2 — Orders and Checkout Transaction Engine

Floor 2 owns:

- transactional order placement;
- addresses and item snapshots;
- authoritative totals;
- stock reservations;
- idempotency;
- retry recovery;
- prevention of duplicate order creation;
- successful checkout integration;
- concurrency behavior;
- customer-owned order history.

A database commit followed by a missing client response is a Floor 2 reliability risk because
retry behavior may create duplicate orders when idempotency is absent. Duplication must not be
claimed as certain unless retry-identifier behavior is directly verified.

## FLOOR 7 — Security Hardening and Automated Testing

Floor 7 owns:

- complete RLS audits;
- function security audits;
- Storage audits;
- concurrency tests;
- failure tests;
- checkout end-to-end tests;
- last-unit tests;
- duplicate-request tests;
- CI enforcement of security and reliability gates.

The repository does not have a complete Floor 7 gate merely because Playwright happens to run
tests in parallel locally — parallel execution is an incidental property of the default Playwright
configuration, not a designed or CI-enforced concurrency gate.

## Ownership rules

1. **Later-floor failures do not automatically block earlier, already-completed subphases.** A
   Floor 2 or Floor 7 finding (e.g. the checkout response-loss condition) does not by itself
   reopen a Base subphase that has already met its own, narrower exit criteria.
2. **Full BASE cannot be marked complete until every Base exit criterion above is evidenced.**
   A partial pass (e.g. migrations and RLS tests green, staging/MFA/role-model gaps open) is
   reported as `PARTIAL`, never rounded up to complete.
3. **Migration-parity completion is narrower than full Base completion.** Migration-parity
   (schema/migration reproducibility, local rebuild, Foundation pgTAP, Edge Function/Storage
   source preservation, TypeScript/lint/build) is one input to full BASE, not a substitute for it.
