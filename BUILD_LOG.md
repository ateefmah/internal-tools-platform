# Build log

| Date | Change | Apps touched | Notes |
| --- | --- | --- | --- |
| 2026-10-27 | Platform scaffold: Next.js App Router + TS, better-sqlite3 + drizzle, personas (mock SSO), requireRole/requirePermission, append-only audit, assertNotSelfApproval, PII masking + audited reveal | all | Controls live in src/lib; enforced by tests/controls.spec.ts |
| 2026-10-27 | Refunds app | refunds | Agent ≤$100, finance ≤$5,000, above that needs approval by a different finance manager |
| 2026-10-27 | KYC queue | kyc | Analyst first pass; high-risk needs second review by a different senior; email + tax ID masked with audited reveal |
| 2026-10-27 | Chargebacks app | chargebacks | Contest then resolve; resolver must differ from contester |
| 2026-10-27 | Expiry Alerts app | expiry-alerts | Built from a plain-English Slack request — see docs/slack-request.md |
| 2026-10-27 | Tool Requests intake + Audit Log page | requests, audit | Intake for app #N; global append-only audit view |
| 2026-10-27 | CI workflows | platform | ci.yml on push/PR; weekly-maintenance.yml every Monday 09:00 UTC (lint, typecheck, controls test, npm audit) |
