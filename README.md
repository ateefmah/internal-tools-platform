# InternalOps

A prototype internal-tools platform for a fintech evaluating a move off
Microsoft Power Apps. The point is not the apps — it is that platform
controls (roles, append-only audit, maker-checker, PII masking) are built
once and enforced by CI, so app #N is a plain-English request plus a page.

Synthetic data only. Never real PII.

## Stack

- Next.js (App Router) + TypeScript, server actions for writes
- SQLite via drizzle-orm + better-sqlite3 (schema is Postgres-ready)
- Vitest for the controls conformance test
- One Playwright smoke test

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm test             # tests/controls.spec.ts — the CI gate
npm run test:e2e     # Playwright smoke (starts the dev server itself)
```

Sign in via the persona switcher in the header — it is **mock SSO** (a
cookie), labeled in the UI, per the spec. Try:

- As **support agent**: issue a $42 refund (pays instantly). Then try $250
  — it goes to `pending_approval`.
- As **finance manager**: approve that refund. Note you cannot approve a
  refund you requested yourself.
- As **KYC analyst**: decide the high-risk case — it moves to
  `awaiting_second_review`. As the same analyst you cannot clear it.
- As **KYC senior**: give the second review. Also click "reveal" on the
  masked email — the reveal is permission-gated and writes an audit row.
- As **ops manager**: submit a tool request in plain English. As
  **engineer**: triage it to shipped.
- `/audit` — every one of those writes, plus the PII reveals and persona
  switches, in one append-only log.

## The controls (src/lib)

1. `requireRole()` / `requirePermission()` run server-side before every write.
2. `audit.record()` is called with the open transaction handle, so the audit
   row commits atomically with the write. `audit_log` has no update/delete path.
3. Money movement and PII reveals go through approvals; `assertNotSelfApproval()`
   blocks the requester from approving their own request.
4. PII fields are masked in the page (`lib/mask.ts`); revealing calls
   `lib/reveal.ts`, which requires `pii:reveal` and writes an audit entry.

`tests/controls.spec.ts` scans every source file and fails CI if a DB write
skips a control, an approval path skips the self-approval check, `audit_log`
is mutated, a route is missing from `src/apps/registry.ts`, or a page renders
PII unmasked. **Never weaken or skip it.**

## Apps (src/apps/registry.ts)

| App | Where it came from |
| --- | --- |
| Refunds | Playbook — per-role limits, maker-checker above $100 |
| KYC Review Queue | Playbook — dual review on high-risk cases |
| Chargebacks | Playbook — contest then resolve by a different teammate |
| Expiry Alerts | Built from a plain-English Slack request — see docs/slack-request.md |
| Tool Requests | Platform intake — how app #N gets requested |
| Audit Log | Platform — every controlled write |

## Maintenance

`.github/workflows/weekly-maintenance.yml` runs every Monday 09:00 UTC:
lint, typecheck, the controls test, and `npm audit` — a controls or
dependency regression surfaces without waiting for the next PR. `ci.yml`
runs the same gates on every push/PR.

## What is deliberately not here

Real SSO (mocked persona switcher), deployment (documented, not built),
a feature-flag admin (use the flag vendor's UI), a drag-and-drop builder,
and notifications. See `docs/DECISIONS.md` for the reasoning.
