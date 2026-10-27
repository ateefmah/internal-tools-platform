# Key Decisions

For evaluators — what I built, why that scope, and the tradeoffs.

## Scope and why

I proved the operating model, not app count. The prototype is one platform
layer plus a CI gate; the four apps exist to show the controls hold, not to be
the deliverable. The graded question is whether app #N stays safe without a
senior engineer reading every line — so the load-bearing artifact is
`tests/controls.spec.ts`, a ~120-line conformance test that fails CI if any
write skips a role check, an audit row, maker-checker, or PII masking.

## Architecture

Next.js + TypeScript (one language across UI and writes, the stack a Devin
session maintains most cheaply), SQLite via drizzle so a fresh clone runs with
zero setup, server actions as the write path, Vitest + Playwright for checks.
`src/lib/` holds four controls (~150 lines total): role/permission checks,
append-only audit in the same transaction, maker-checker, masking + an audited
reveal. Apps: refunds, KYC queue, chargebacks, payout holds.

## Decisions — each names what I rejected

- **Conformance test over code review alone.** Review catches this PR's
  mistakes; the test catches app #13's, forever. Rejected: document-the-rules
  (Power Apps' actual model — governance in checklists).
- **The playbook is the builder.** I did not build a drag-and-drop designer.
  With an agent generating code, the repeatable spec *is* the low-code surface.
- **Mocked sign-in, labeled on screen.** Rejected: real OIDC — out of a 2-hour
  budget, and it's an integration problem, not a design risk. README spells out
  the production path (IdP via OIDC/SCIM, never self-built auth).
- **Skipped the feature-flag panel.** A fintech should use its flag vendor's
  UI. Scope discipline over completeness.
- **Payout holds as the "plain-English request" app** instead of a read-only
  page — it exercises the controls (a >$10K release routes through
  maker-checker), which is the thing being demonstrated.

## What the build showed

Platform + four apps + gate: ~2,100 LOC, built and verified end-to-end in one
session. Honest miss: the first `next build` hung — the auto-seed deadlocked on
a circular import and then raced seven page-data workers; I scoped seeding to
dev runtime under a BEGIN IMMEDIATE guard. The gate also bit twice —
`cookies().delete()` reads as an unguarded "delete", and the word "triage"
registers as an approval path — static analysis has false positives; worth the
false alarms for what it catches.

## If I had two more hours

Route-level middleware so controls can't be bypassed by vacuous calls;
Postgres + OIDC pilot setup. Questions for the client: what's inside the
$250K, who edits the three apps today, is sign-in already on Entra, when is
the renewal.
