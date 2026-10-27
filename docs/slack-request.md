# The plain-English request that produced Payout Holds

Posted as an ops manager (simulated for this prototype — the real loop is a
Slack automation that starts a Devin session with the playbook and an ACU cap):

> **Tom Aldridge (ops manager)**
> We need a simple tool to track payout holds on merchants: who placed the
> hold, the reason, the amount held, and a release button. Releases over $10K
> should need a finance manager to approve.

How it went through the platform:

1. The request was logged in the Tool Requests intake (`/requests`), visible
   in the seeded data.
2. Devin built the app: `src/app/payout-holds/`, a `payout_holds` table, a
   registry entry in `src/apps/registry.ts`.
3. The platform controls applied automatically: `payout.manage` to place and
   release holds, `payout.release.approve` for finance, and
   `assertNotSelfApproval` so the person who placed a hold can't approve its
   release. Releases over $10K route through `release_pending`.
4. `tests/controls.spec.ts` requires no extra work — but it would fail CI if
   any of those controls were missing.

This is the pattern for the 10+ planned apps: the requester never leaves plain
English, the controls come from the platform, and registration is enforced by
the registry test.
