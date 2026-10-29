# Power Apps parity architecture

What it would take for a self-built platform to meet every requirement Power
Apps actually covers — not the demo version, the production version.

Companion docs: `power-apps-research.md` (sourced facts), `recommendation.md`
(the verdict). This doc is the engineering answer to "okay, so what would we
actually have to build?" Written 2026-10-27.

## 0. How enterprises actually use Power Apps

Read the case studies first, because the requirement list falls out of *how*
the platform is used, not what it is:

- **Rabobank** made it the default platform for internal process automation —
  2,500+ solutions for a 40,000-person bank. A regulated institution trusting
  it means the compliance substrate (audit, access control, DLP) is the product.
- **Metro Bank** has run a greeter app on tablets in 50+ branches since 2017,
  and built a time-tracking tool in six weeks *without IT involvement*. This is
  the citizen-developer unlock: near-zero marginal cost per app.
- **Network Rail** runs ~11,000 apps and 28,000 flows with 2,500 makers behind
  a governance model — the platform's job is mostly letting thousands of
  non-engineers move fast without breaking things.
- **Deutsche Bahn** uses managed environments: makers build in dev, local
  experts review, approved apps promote to prod. ALM is a governance tool, not
  a deployment detail.
- **ZF Group** scaled to 25,000 apps with an enterprise-wide governance model
  — the lesson is that sprawl is the failure mode, and the governance layer is
  what makes citizen development safe.

Pattern: the value isn't any single app. It's (a) a compliance substrate you
don't re-derive per app, (b) a maker workforce that doesn't queue on
engineering, and (c) guardrails (environments, DLP, CoE) that let IT say yes.
Any self-built platform has to answer all three, not just the first.

## 1. The requirement surface

Everything Power Apps provides that this client plausibly uses, grouped by
layer. Marked: **[P0]** can't ship an internal tool platform without it,
**[P1]** needed within a quarter, **[P2]** only if usage patterns demand it,
**[C]** concede — replicating it costs more than it's worth here.

### Identity & access

| Requirement | Power Apps implementation | Priority |
|---|---|---|
| SSO + MFA | Entra tenant membership; conditional access free | P0 |
| Role-based access control | Security roles per environment | P0 |
| Record-level scoping | Owner/team-scoped record privileges, hierarchy | P0 |
| Field-level security | Column-level security profiles (e.g. tax IDs) | P0 |
| Provisioning | SCIM / group sync into roles | P1 |
| Per-app conditional access | Managed Environments feature | P2 |

### Data

| Requirement | Power Apps implementation | Priority |
|---|---|---|
| Managed datastore | Dataverse (relational, schema'd, hosted) | P0 |
| Schema evolution | Solution-managed table/column changes | P0 |
| Record audit history | Dataverse auditing at SDK layer — unbypassable | P0 |
| Business rules | Declarative validation/defaulting on entities | P1 |
| Bulk import/export | Dataflows, Excel round-trip (audited!) | P1 |
| Environment data isolation | Per-environment Dataverse databases | P0 |

### Governance & compliance

| Requirement | Power Apps implementation | Priority |
|---|---|---|
| Append-only audit | Dataverse audit log + Purview activity logs | P0 |
| Audit of reads & exports | Purview logs bulk views, Excel exports | P1 |
| DLP policies | Connector classification: business/non-business/blocked + combination rules | P1 |
| Segregation of duties | Enforced per-app via approval flows | P0 (already in prototype) |
| Environment promotion | Managed/unmanaged solutions, pipelines | P0 |
| Usage analytics | Managed Environments insights | P1 |
| Attestations | Microsoft's SOC/ISO coverage under customer | C — can't replicate, only replace with own audit trail |

### Integrations

| Requirement | Power Apps implementation | Priority |
|---|---|---|
| Out-of-box connectors | 1,000+ (SharePoint, Teams, Outlook, SQL…) | P1 for the 3-5 the client actually uses |
| Custom connectors | OpenAPI wrapper w/ auth handling | P1 — the realistic path for their APIs |
| On-prem/private network | On-premises data gateway | C — their services are cloud |
| Queued/offline writes | Power Automate retry + async flows | P1 |

### Workflow & automation

| Requirement | Power Apps implementation | Priority |
|---|---|---|
| Approval workflows | Power Automate approvals (multi-stage, delegation) | P0 |
| Scheduled jobs | Recurrence triggers | P0 (KYC SLA, chargeback deadlines need it) |
| Event-driven flows | Dataverse triggers, webhook triggers | P1 |
| Notifications | Outlook/Teams/posts out of box | P0 |
| RPA / UI automation | Desktop flows | C |

### Runtime & UX

| Requirement | Power Apps implementation | Priority |
|---|---|---|
| Web runtime | Browser player | P0 |
| Mobile runtime | Native iOS/Android players | P2 — ask if anyone uses it; Metro Bank's greeter app says yes for frontline |
| Offline-first | Dataverse offline sync w/ conflict detection | C unless field ops exist — it's a whole sync engine |
| Embedding | Teams tabs, SharePoint embeds | P2 |
| Accessible UI | WCAG-conformant generated controls | P1 — generated UI gets it free; hand-written React must earn it |

### Maker experience

| Requirement | Power Apps implementation | Priority |
|---|---|---|
| Visual builder | Canvas designer / model-driven generation | C in kind — replace with Devin + playbook |
| AI-assisted creation | Copilot "describe the app" | Parity via Devin — arguably exceeds it |
| Formula language | Power Fx for rules | Replaced by real code + review |
| Component library | Reusable PCF/standard controls | P1 — a shared component kit is the analog |
| Self-serve publishing | Maker publishes to environment | C — PR + human merge is the deliberate trade |

### Lifecycle (ALM)

| Requirement | Power Apps implementation | Priority |
|---|---|---|
| Dev/test/prod environments | Environment containers | P0 |
| Promotion pipeline | Solutions + deployment pipelines | P0 — git already solves this |
| Rollback | Managed solution uninstall | P0 — git revert solves |
| Environment isolation for makers | Personal dev environments | P1 — each Devin session is effectively one |

## 2. Target architecture

```
                        ┌─────────────────────────────────────────────┐
   ops/finance/KYC ───► │                 Web + PWA                   │
                        │   Next.js apps (generated, code-reviewed)   │
                        └──────────────┬──────────────────────────────┘
                                       │ server actions only (no client→db)
                        ┌──────────────▼──────────────────────────────┐
                        │            Controls layer (code)            │
                        │  requirePermission · policy engine ·        │
                        │  maker-checker · masking · idempotency      │
                        └──────┬───────────────────────┬──────────────┘
                               │ every write           │ every decision
                        ┌──────▼──────┐         ┌──────▼───────────┐
                        │  Postgres    │         │  Event/audit log  │
                        │  + RLS       │         │  append-only →    │
                        │  schemas/app │         │  WORM export      │
                        └──────────────┘         └──────────────────┘
                               ▲                        ▲
        ┌──────────────────────┼────────────────────────┼─────────────┐
        │                      │                        │             │
 ┌──────▼───────┐    ┌─────────▼──────┐       ┌─────────▼──────┐  ┌───▼────────┐
 │ Identity:     │    │ Connector layer │      │ Workflow engine │  │ Observe-   │
 │ OIDC (Entra)  │    │ typed clients, │      │ approvals,     │  │ ability:   │
 │ SCIM→roles    │    │ secrets, retry,│      │ schedules,     │  │ OTel,      │
 │ per-app claims│    │ DLP allowlist  │      │ notifications  │  │ audit UI   │
 └──────────────┘    └────────────────┘      └────────────────┘  └────────────┘

   Devin loop:  request (Slack/intake) → session → playbook → PR
                → conformance gate in CI → human merge → deploy
```

### 2.1 Identity (replaces Entra/tenant membership)

- OIDC sign-in against the company IdP (Entra ID or Okta) — NextAuth/Auth.js
  or a thin passport layer. No password handling, ever.
- SCIM provisioning into a `users` + `role_assignments` table. Groups in the
  IdP map to platform roles; deprovisioning is automatic.
- Role claims ride in the session token; `requirePermission` stays server-side
  exactly as prototyped.
- Per-app access: an `app_entitlements(role, app)` table gates which roles see
  which apps — replaces Power Apps per-app sharing.

### 2.2 Data (replaces Dataverse)

- Postgres, one schema per app, `internal_ops` as the platform schema. RLS
  policies mirror Dataverse record-level security: an analyst sees assigned
  KYC cases; finance sees refunds, not tax IDs unmasked.
- Column security = masking layer stays in code *plus* revoked column grants
  on sensitive columns for app-role DB users — defense in depth, unlike the
  prototype's convention-only approach.
- Migrations per app schema; seed data as migration fixtures. Schema changes
  go through the same PR gate as everything else.
- Dataverse "business rules" → check constraints + a thin rules module per
  domain (thresholds like `SUPPORT_LIMIT_CENTS` live in a policy table, not
  constants, so finance can tune them via an admin app — eat your own food).

### 2.3 Audit (replaces Dataverse auditing + Purview)

- Keep the append-only `audit_log`, but make it tamper-evident: hash-chained
  rows (each row carries `prev_hash`), plus a nightly export to object storage
  with object-lock (WORM). Auditors get an export they can verify, which is
  the substance of what Purview gives Microsoft customers.
- Extend coverage to *reads that matter*: PII reveals (already), bulk exports,
  permission changes — the Purview "Export to Excel" event is the model.
- The conformance test stays as CI belt-and-suspenders, but the *real*
  guarantee moves to the DB: writes through a stored-procedure-style
  `write_with_audit()` path or DB-level triggers, so no code path can bypass
  it. This fixes the biggest honest gap — today audit is enforced by a regex.
- Audit query UI: keep `/audit`, add filters + export-to-csv (itself audited).

### 2.4 Connectors (replaces the connector marketplace)

Not a marketplace — a **typed integration layer** for the 4-6 systems the
client actually has: payment processor (refund API), KYC vendor (Onfido/
Persona-class), Slack/Teams notifications, feature-flag store, data warehouse.

- One `connectors/` package: each connector is a typed client with
  `auth`, `idempotencyKey` support, retry/backoff, and request/response
  schemas validated at the boundary.
- Credentials live in the secrets manager; connectors never see raw secrets.
- DLP analog: an egress allowlist — each app declares its permitted
  connectors in `registry.ts`; the conformance gate fails an app that calls a
  connector it didn't declare. That's the build-time half of DLP.
- Runtime half: outbound calls route through the connector layer, so a
  "business data only" policy can be enforced centrally (e.g., a connector
  tagged `restricted` can't be called from an app that also reads PII).
  This is deliberately simpler than Microsoft's combination-matrix DLP —
  their version exists to police thousands of makers; ours polices a
  code-reviewed allowlist.

### 2.5 Workflow (replaces Power Automate)

- Approvals: the prototype's status machines (`pending_approval`,
  `release_pending`, `pending_signoff`) generalize into a `workflow` table —
  `{entity, state, assigned_role, sla_at}` — so "needs a second approver" is
  platform plumbing, not per-app logic.
- Scheduled jobs: a tiny scheduler (node-cron inside the app process is
  fine at this scale; pg-boss or a cron container if they outgrow it) for KYC
  SLA nags and chargeback deadline escalation — both already have `deadline`
  fields doing nothing.
- Notifications: Slack webhook connector — post to the requester's thread,
  which is also where the intake lives. Email via the connector layer if
  needed.
- Multi-stage approvals and delegation (approver OOO → delegate) are
  configuration on the workflow table, not new code.

### 2.6 Runtime (replaces the players)

- Web: keep Next.js. Add a shared component kit (`components/`) — table,
  pill, notice, toolbar, form — so generated apps stay consistent. That kit
  is the PCF analog.
- Accessibility: the kit ships WCAG-conformant controls; the conformance
  gate adds a JSX a11y rule pass. Generated Power Apps UI gets this free;
  ours needs a lint-level guarantee.
- Mobile: PWA + responsive CSS covers "check the queue on a phone." Native
  offline-first (Metro Bank greeter territory) is conceded unless the client
  has field users — it's a sync engine, not a feature, and the honest answer
  is "buy a different tool for that app" or keep one Power Apps license tier
  for it.

### 2.7 ALM (replaces environments + solutions)

This is where self-built is *better*, and it's worth saying plainly:

- Environments → git branches + deploy stages (preview deploy per PR is
  better than a sandbox environment).
- Solutions → the repo; promotion → merge + deploy pipeline. Managed
  solution uninstall → revert.
- Maker dev environments → Devin sessions, which are already isolated VMs
  with their own seeded DB. Better than per-maker Dataverse environments.
- What's genuinely lost: makers *can't* promote anything without a merge.
  That's the trade, chosen deliberately — for a fintech, unaudited
  self-promotion is the bug Power Apps spends Managed Environments trying to
  fence, not a feature.

### 2.8 Maker experience (the honest substitute)

Can't replicate drag-and-drop, and shouldn't try. The substitute is a
three-level ladder matching how mature Power Apps orgs actually tier apps:

1. **Trivial apps** (list + form + a rule): a declarative spec — an
   `app.yaml` (entities, fields, roles, rules) that a generic CRUD renderer
   + policy engine serves with zero code. Devin writes the yaml; the gate
   validates it. This covers maybe half of "the next 10 tools" honestly.
2. **Workflow apps** (queues, approvals, money-adjacent): Devin builds from
   `playbooks/new-internal-app.md` — as done for payout holds, ~20 min of
   session time. The playbook is the template library from the CoE playbook.
3. **Bespoke apps**: full code, same path. Fusion-team pattern (EY case
   study): ops describes, engineering lands it.

The claim is not "ops builds it themselves" — it's "ops asks, and gets a
reviewed, conforming app in under an hour." Whether that's good enough is a
routing question from `recommendation.md`, and it's the sharpest fork in the
whole decision.

### 2.9 Governance ops (replaces the CoE layer)

- `registry.ts` grows into the app catalog: owner, classification
  (money-touching / PII / internal-only), support tier, data sources.
- Classification drives requirements automatically: `pii: true` forces
  masking + reveal-permission; `money: true` forces maker-checker. Declared
  in the registry, enforced by the gate — same mechanism as ZF/Deutsche
  Bahn's criticality tiers, expressed as code.
- Usage analytics: platform logs requests per app; a `/admin` dashboard shows
  per-app usage, stale apps, failed actions — the Managed Environments
  insights analog.
- Ownership rule from the case studies: every org that succeeded had a CoE
  or equivalent. Here that's the named platform owner + backup from the
  kill criteria — one person owns the controls layer; apps are cheap
  precisely because they don't re-derive it.

## 3. Parity ledger

| Layer | Parity? | Cost to reach it |
|---|---|---|
| Identity (SSO/SCIM) | Yes — standard OIDC work | ~1-2 wks |
| Datastore + record security | Yes — Postgres + RLS | ~2 wks incl. migration |
| Append-only audit | Yes — and tamper-evident | ~1 wk (hash chain + WORM export) |
| Read/export audit | Yes | days |
| Approval workflows + schedules | Yes — workflow table + cron | ~1 wk |
| Notifications | Yes — Slack/Teams connector | days |
| Integrations (realistic set) | Partial — the 4-6 they use, not 1,000 | ~1 wk per connector |
| DLP | Partial — allowlist + classification, not per-connector matrix | days (declared) |
| ALM/environments | Yes — git/deploys, arguably better | mostly exists |
| Usage insights | Yes — basic | days |
| Component kit + a11y | Yes — with effort | ongoing |
| Declarative trivial apps | Yes — app.yaml renderer | ~1 wk |
| AI app generation | Exceeds it — Devin vs Copilot | — |
| Mobile PWA | Partial | days |
| Native mobile + offline | **No — conceded** | months+; not worth it |
| Connector marketplace breadth | **No — conceded** | unbounded |
| Maker self-publish | **No — deliberately** | the chosen trade |
| Microsoft attestations/SLA | **No — replaceable** | own pen test + audit evidence |
| On-prem gateway, RPA, Power Fx | **No — conceded** | irrelevant here |

## 4. What the build actually looks like

Realistic phasing for ~2 engineers + Devin sessions doing most of the code:

- **Weeks 1-2 — substrate:** OIDC + SCIM, Postgres + RLS, hash-chained audit +
  WORM export, policy tables. Nothing user-facing; this is the part Power
  Apps gives free and the part that must be right.
- **Week 3 — workflow + notifications:** generalized approval table, Slack
  connector, scheduler; migrate the four prototype apps onto them.
- **Week 4 — first real app end-to-end:** one new tool from intake → Slack
  request → Devin build → deploy, under pilot conditions with exit criteria.
- **Quarter:** connectors (payment processor, KYC vendor, flag store),
  component kit hardening, app.yaml renderer, admin dashboard, pen test on
  the controls layer.

The fixed cost is real — call it 4-6 engineer-weeks of substrate plus
Devin's marginal time — and it is paid *once*. Every app after that is the
~20-minute payout-holds exercise. That is the entire economic argument, and
it only pays off because the client has 10+ apps queued; for 3 apps it would
not.

## 5. The two questions that actually decide this

Everything above is buildable. Whether it *should* be built hinges on the
same two questions as the recommendation — this doc just makes them concrete:

1. **Who authors the next 10 apps?** If ops analysts click them together
   (Metro Bank/Network Rail pattern), no substitute is honest — stay.
   If they queue requests on engineering anyway (Rabobank's automation
   platform pattern), the Devin loop matches or beats the cycle time.
2. **Does anything need native mobile/offline?** One field-ops app is the
   only capability with no credible path. Everything else is effort, not
   impossibility.

## Sources

Case studies: Rabobank, Metro Bank, Network Rail, Deutsche Bahn, ZF Group,
Centrica, EY — microsoft.com/en/customers and learn.microsoft.com case-study
index (links in `power-apps-research.md` and inline searches 2026-10-27).
Capability surface: Microsoft Learn — environments/ALM, Dataverse security
roles & column-level security, data policies (DLP), Purview activity
auditing, canvas mobile offline, managed environments, CoE guidance.
