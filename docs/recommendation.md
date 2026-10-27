# Recommendation: build, phased, with preconditions and kill criteria

**Build new internal tools on a small platform the team owns, with Devin doing
most of the building, and leave Power Apps one app at a time.**

The reason is speed across 10+ apps, no per-user tax, no Power Fx ceiling, and
real tests and git history. The license savings are close to zero once you pay
for ownership — do not pitch this as a $250K saving. It's a capability play.

## The honest ledger

**Replicable cheaply** — Devin does this well:
UI, forms, tables; queues and assignment; approval flows and limits;
integrations with their own services; reporting views; tests and CI.

**Replicable but owned forever** — Devin does the labor, a human owns it:
role and field-level access; audit storage and immutability; access-review
evidence for auditors; hosting, backups, patching; on-call for tools ops
depends on; wiring to their IdP (never build auth itself).

**Not replicable** — Power Apps keeps these:
ops/compliance editing apps themselves without a PR; Microsoft's attestations
and SLA; someone else's pager; the connector marketplace (~200+ turnkey
integrations); mobile/offline runtime.

## The $250K question

Premium lists at $20/user/month, so $250K covers ~1,040 users (~947 at the
January 2027 price of $22). A ~60-engineer Series C likely has a few hundred
employees — either nearly everyone is licensed or the bill includes capacity
and add-ons. **Ask what's in it before modeling anything.** And say this before
the VP does: Premium is per-user, not per-app — ten more apps cost roughly
nothing extra for the same users. "Save the license as we add apps" is a weak
argument; the real cost drivers are the 2027 price rise and February 2027
license enforcement, which are a forcing function either way.

## Four lenses

| Lens | Keep Power Apps | Build with Devin | Hybrid: code apps |
|---|---|---|---|
| Build cost | Low for queue/approval apps; custom code still needed for money movement and integrations | One-off platform build, then one session per app | Devin writes React/TS code apps inside Power Platform |
| Maintenance | Microsoft runs the runtime; you run environments, DLP, roles, licenses, pipelines, 2 release waves/yr | You run hosting, patching, on-call, audit storage; Devin does upgrades on a schedule | Both: Power Platform admin plus code in git |
| Security | Inherits Entra, Dataverse roles/field security, auditing, DLP, attestations | Every control is yours to build, test and evidence; identity stays on their IdP | Inherits Power Platform governance; app logic is yours |
| Opportunity cost | Least engineer time, but Power Fx is slow to test and review | ~1 engineer owning the platform; apps 4–13 ship faster | Low; engineers write code only where it pays off |

## Routing each app — four questions

1. **Can you name a platform owner and a backup before any production code?**
   No → keep Power Apps; use Devin to write code apps and custom connectors.
2. **Does sign-in stay on your IdP (OIDC + SCIM)?** No → fix that first.
3. **Does ops or compliance edit this app themselves every week?**
   Yes → it stays on Power Apps, or becomes a code app.
4. **Does it move money or expose PII?** Yes → build it last, after a pen test
   and compliance sign-off.

Everything clearing all four goes on the platform, built from the playbook.

## Phasing

- **Weeks 0–2**: confirm what's in the $250K, licensed users, who edits each
  app, the IdP, SOC 2 scope, renewal date. Name owner + backup.
- **Days 1–30**: pilot — make the platform production-grade (IdP sign-in,
  audit to WORM/SIEM, hosting, secrets, on-call) and ship one new app from a
  real request.
- **Month 2**: flags first (or replaced by the vendor's UI), then refunds with
  a real payment adapter and daily reconciliation.
- **Month 3+**: KYC last, after a pen test and compliance sign-off.
- **At renewal**: right-size seats for what remains; time it against the
  January price change.

## Kill criteria — reverse course if

- The platform owner leaves and isn't replaced within a quarter.
- The pen test or first audit finds control failures not fixable in one cycle.
- Both systems are still running after two quarters.
- Most of the 10 planned apps turn out to be form tools ops edits themselves.

## Pilot exit criteria (examples — agree real numbers with the VP)

- A request becomes a merged PR within one working day.
- Zero merges that bypass the conformance test.
- Owner upkeep stays under an agreed weekly hour budget.
- Security review closes with no open high findings.

## Where Devin fits either way

- **Build**: builds the platform and apps from the playbook; runs weekly
  dependency/CVE upgrades; writes tests and audit-evidence scripts. People
  still own the pager, platform merges, and the auditor relationship.
- **Keep/Hybrid**: writes Power Apps code apps in React, custom connectors for
  money movement, generates tests and evidence, helps set up ALM pipelines.
  People still own Power Platform admin, DLP, licensing, release-wave testing.
