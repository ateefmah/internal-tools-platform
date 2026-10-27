# AGENTS.md

## What this repo is
A prototype internal-tools platform for a fintech evaluating a move off
Power Apps. Synthetic data only. Never use or request real PII.

## Stack
Next.js (App Router) + TypeScript, SQLite through an ORM (Postgres-ready),
Vitest, one Playwright smoke test.

## Commands
install:   npm install
dev:       npm run dev   (http://localhost:3000)
lint:      npm run lint
typecheck: npm run typecheck
test:      npm test

## Non-negotiable controls (every route that writes)
1. requireRole() runs server-side before the write.
2. audit.record() runs in the same transaction; the audit table is append-only.
3. Money movement and PII reveals go through approvals.
   The requester can never approve their own request.
4. PII fields are masked server-side. Reveal needs a permission
   and writes an audit entry.
tests/controls.spec.ts must pass. Never weaken or skip it.

## Definition of done
Lint, typecheck and tests pass. New apps are registered in
src/apps/registry.ts. Attach a screenshot of the feature to the PR.
Add a row to BUILD_LOG.md.

## Out of scope
Real SSO (the persona switcher is mocked and labeled), deployment,
a drag-and-drop builder, notifications.
