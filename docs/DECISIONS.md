# Key Decisions — InternalOps Platform prototype

*One page. Written for evaluators, not the client.*

## What I chose to build and why

The client's real question isn't "can an AI build a dashboard" — it's "can we stop
paying for a platform and still ship 13+ internal tools." Power Apps' value is
mostly in the *platform layer* (identity, access control, audit, hosting, app
lifecycle), not in any single app. So I built the same shape: **a thin shared
platform plus three working apps that mirror what they run today** (KYC review
queue, refunds dashboard, feature-flag admin). If the pattern works for three
apps that differ in workflow and policy, the next ten are repetition, not risk.

The prototype was built entirely by Devin in ~2 hours — that fact is itself the
demo: it shows that "Devin builds the apps" is the replacement for "low-code makes
them fast."

## Architectural decisions

- **FastAPI + SQLAlchemy + server-rendered Jinja, one process, SQLite.** Zero
  infrastructure, runs anywhere in one command, easy for a VP to spin up. Models
  port to Postgres by swapping a connection string — the schema is real, only the
  driver is demo-grade.
- **The platform owns identity, RBAC, and audit; apps own workflow and policy.**
  `agent`/`lead`/`admin` roles, a signed-session dependency, and one `audit_events`
  table every app writes through a single `audit.log()` call. New apps inherit
  this for free — same role Dataverse + app registration play in Power Apps.
- **Controls as the feature.** I deliberately picked the policies a fintech
  actually needs rather than more CRUD: maker-checker dual approval on high-risk
  KYC cases (self-approval blocked), a dollar threshold that pushes refund
  decisions to leads, and fully audited flag toggles. These are trivially
  expressible in code and awkward/expensive in low-code — exactly the asymmetry
  that justifies owning the tools.

## Tradeoffs I made, honestly

- **No self-serve for non-engineers.** Power Apps lets an ops analyst drag a UI
  together. My model requires Devin (or an engineer) per app. At 60 engineers and
  10+ planned tools, I judged the bottleneck is engineering throughput, which
  Devin addresses — not citizen development, which this team doesn't obviously need.
- **Demo-grade auth and secrets.** Cookie sessions and seeded users are honest
  shortcuts; production means OIDC/SSO, which is a library integration but also
  means we *own* the auth surface that Microsoft currently manages for them.
- **Server-rendered, no mobile.** Power Apps gives mobile + accessibility for
  free. Internal ops tools here are desktop-first, so I traded that away
  consciously — it's a real gap if they have warehouse/field workflows.
- **No connector marketplace.** Power Apps' 200+ connectors are the underpriced
  part of the license. I didn't replicate integration breadth — the honest answer
  is that each real integration is bespoke API work, partially offset by Devin
  writing it.

## The decision I'd defend

Build-vs-buy turns on *who authors the apps*, not on features. A 60-engineer
fintech that already does code review, Git, and CI gets governance for free in
code (the Power Platform "sprawl" problem disappears — every tool is a reviewed
PR). The license savings are real but secondary; the primary gain is that these
tools become normal software: testable, auditable, diffable, and not hostage to
per-seat pricing as they scale to hundreds of ops users.
