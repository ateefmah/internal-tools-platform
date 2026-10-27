# Playbook: new-internal-app

Turn a short plain-English request into a new app on this platform.

## Overview

Each internal app lives in `src/app/<slug>/` with a page plus `actions.ts`
(server actions for writes), a table in `src/lib/db/schema.ts` (+ the matching
`CREATE TABLE` in `src/lib/db/index.ts`), seed rows in `src/lib/db/seed.ts`, and
an entry in `src/apps/registry.ts`.

## What's needed from the user

One short paragraph: who uses it, what they track, and which actions need
approval. If the request is ambiguous, ask one clarifying question before
starting.

## Procedure

1. Restate the request as a short spec: entities, states, roles, approvals.
2. Data model: add tables to `schema.ts` and `db/index.ts`; add seed rows.
3. Routes in `actions.ts` (`"use server"`): every mutation goes through
   `requireRole`/`requirePermission` first, writes inside
   `db.transaction((tx) => ...)`, and calls `audit.record(tx, ...)` in the
   same transaction. Approval decisions call `assertNotSelfApproval`.
4. Page (`page.tsx`): a table, a detail view (or inline row detail), and the
   action forms. Plain words — users are ops, support, compliance, finance.
   Mark the file `export const dynamic = "force-dynamic"`.
5. Register the app in `src/apps/registry.ts` (`kind: "app"`, owner, status).
6. Tests: run `npm run lint`, `npm run typecheck`, `npm test`. The conformance
   test (`tests/controls.spec.ts`) is the gate — it fails if any write skips a
   control. Also verify each role's blocked action in the browser.
7. PR: screenshots of the feature (including one blocked action), and a row in
   `BUILD_LOG.md`.

## Advice / pitfalls learned

- Words like `approve`, `resolve`, `triage` in a file that mutates the DB make
  the conformance test require `assertNotSelfApproval` — only approval paths
  should contain them.
- `cookies().delete()` trips the mutation scan — expire cookies via
  `set(name, "", { maxAge: 0 })` instead.
- Don't render `.email` or `taxId` in `src/app/` files without `maskEmail`/
  `maskTaxId` — and components that only *name* those fields belong in
  `src/components/`, outside the scanned app tree.
- Seed changes belong in `src/lib/db/seed.ts` only (it's whitelisted); the seed
  runs on first dev boot and is skipped during `next build`.
- Money is integer cents; format with `money()` from `src/lib/mask.ts`.
- Use distinct seeded users to demo maker-checker — two finance managers exist
  for exactly that.

## Forbidden

- Never edit `src/lib/` controls to make a feature easier.
- Never weaken or skip `tests/controls.spec.ts`.
- Never put real PII in seed data — synthetic only.
- No writes outside `db.transaction` paired with `audit.record`.
