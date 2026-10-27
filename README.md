# InternalOps

A prototype internal-tools platform for a fintech evaluating whether to build
internal tools with Devin instead of renting Microsoft Power Apps. It exists to
answer one question: **can app #N get requested, built, reviewed and maintained
safely, with governance enforced by CI instead of a vendor?**

Recommendation it supports: **build new tools on a small platform the team owns,
with Devin doing most of the building — and leave Power Apps one app at a time.**
See `docs/recommendation.md`.

## Run it

```bash
npm ci
npm run dev    # http://localhost:3000 — seeds synthetic data on first run
```

Checks: `npm run lint` · `npm run typecheck` · `npm test` (includes
`tests/controls.spec.ts`, the conformance gate) · `npm run test:e2e`.

## Who to sign in as

`/signin` is a labeled mock of company SSO. Pick a persona:

| Persona | Role | Try this |
|---|---|---|
| Sam Ortiz | Support agent | Refund the $42 charge — works. Try the $189.50 one — blocked at $100. |
| Fay Iyer | Finance manager | Request the $7,800 refund → lands "pending approval". Try to approve it yourself → **blocked** (maker-checker). |
| Priya Nair | Finance manager | Approve Fay's refund → completes. |
| Ken Bale | KYC analyst | Claim a case. Open a high-risk one → forced to escalate, can't decide it. Click **Reveal** on a masked tax ID → audited. |
| Kim Zhao | KYC senior | Decide Ken's escalation. Escalate a case yourself, then try to decide it → **blocked**. |
| Tom Aldridge | Ops manager | Log a chargeback, place/release a payout hold. Releases over $10K need finance approval. |
| Dana Cole | Engineer | Has every permission; triage the tool-request intake. |

Then open `/audit` — every write, every actor, every blocked-by-design action is
there.

## What's mocked vs. what production needs

| Prototype | Production |
|---|---|
| Cookie persona switcher, labeled on screen | OIDC + SCIM on the company IdP (Entra/Okta). Never build auth. |
| SQLite via drizzle | Postgres — schema is portable, it's a config change |
| Synthetic seed data | Real adapters: payment provider refunds, KYC vendor API |
| Audit table in-app | Ship audit to WORM storage / SIEM |
| `npm run dev` | Deployed beside existing stack; on-call ownership named |

## Layout

- `src/lib/` — the controls: `require.ts`, `audit.ts`, `mask.ts`, `reveal.ts`
- `src/app/` — one route per app: `refunds`, `kyc`, `chargebacks`,
  `payout-holds`, plus platform pages (`signin`, `audit`, `requests`)
- `src/apps/registry.ts` — every app registers here; CI fails otherwise
- `tests/controls.spec.ts` — the gate: scans every source file, fails CI if a
  write skips `requireRole`/`requirePermission`, `audit.record`, or
  `assertNotSelfApproval`, if `audit_log` is mutated, or if a page renders PII
  unmasked
- `docs/` — `power-apps-research.md`, `recommendation.md`, `key-decisions.md`,
  `slack-request.md`, `VIDEO-SCRIPT.md`
- `playbooks/new-internal-app.md` — the repeatable "build app #N" playbook
- `BUILD_LOG.md` — what was built, when, and what went wrong

## The loop this demonstrates

Ops describes a tool in plain English (`/requests` intake stands in for the
Slack automation) → Devin builds it on this platform from the playbook →
Devin Review + the CI conformance test → a human merges → a scheduled Devin
session maintains it. The controls are written once and enforced on every app.
