# Key Decisions

For evaluators — what was built, why that scope, and the tradeoffs.

## The decision that matters: platform controls as code, enforced by CI

Power Apps' real value for a 60-engineer fintech is not drag-and-drop. It is
that a non-engineer can ship a safe app: sign-in, row-level security,
auditing, and DLP come with the platform. If we evaluate "can Devin build
internal tools," the honest test is whether the same guarantees exist when
the platform is code instead of a vendor product.

So the prototype is not three apps. It is one platform layer
(`src/lib/require.ts`, `audit.ts`, `mask.ts`, `reveal.ts`) plus a
conformance test (`tests/controls.spec.ts`) that fails CI if any write skips
a control. The apps — refunds, KYC queue, chargebacks, expiry alerts — are
demonstrations that the controls hold, not the point.

Why this scope: the client's stated use is a KYC queue, a refunds
dashboard, and a flag admin, with 10+ more planned — all CRUD-with-guardrails
apps for ops/support/compliance/finance users. The expensive part of owning
that is not building pages; it is proving every future app stays safe. The
conformance test is the load-bearing piece: it encodes the AGENTS.md rules
as executable policy, which is something Power Apps cannot give you (its
governance lives in admin checklists and the unmaintained CoE Starter Kit).

## Stack: Next.js + TypeScript + SQLite (drizzle)

Declared by AGENTS.md, and right for the goal. One language across UI and
writes, server actions keep the write path auditable in one codebase,
drizzle keeps the schema portable to Postgres. An earlier iteration used
FastAPI because the build VM lacked Node; the spec's stack is better for
this audience — a single TypeScript codebase is what a Devin session
maintains most cheaply, and it is the stack the client's engineers will
review.

## Deliberate simplifications and their costs

- **Mock SSO**: a cookie-based persona switcher, labeled in the UI. Real
  Entra/SSO is out of scope but is the first thing a real rollout needs —
  it is a solved integration problem (Auth.js/Entra ID), not a design risk.
- **Conformance test is static, not runtime**: it scans source files for the
  required calls rather than interposing on every request. It can be fooled
  by a write that calls the functions vacuously. A production version would
  add route-level middleware; for a prototype the scan catches the real
  failure mode — a new write that forgets the controls entirely.
- **SQLite**: fine for a demo, and drizzle makes the Postgres move a config
  change. Concurrency and scale were not tested; the research doc flags
  this as a real open question for a build path.
- **No feature-flag admin**: the spec is right to cut it — a fintech should
  use a flag vendor's UI (LaunchDarkly, Statsig), not maintain one.
- **Two-hour timebox honored**: the value claim is that Devin builds and
  maintains this cheaply, so the prototype has to look like something an
  agent could produce fast.

## What this means for the recommendation

The controls a fintech actually needs (roles, audit, maker-checker, PII
masking) are small, well-understood, and now enforced by their own CI —
that is the part Power Apps charges $250K/year to rent. What Power Apps
still sells and we did not replicate: connectors to hundreds of SaaS
systems, mobile/offline, per-user governance across dozens of apps, and
citizen-developer authoring. The recommendation in the research doc and
video script stands: build the core queue/dashboard apps with Devin, keep
Power Apps only where its unique surface (connectors, citizen dev) earns
the license.
