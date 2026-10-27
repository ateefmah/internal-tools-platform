# InternalOps Platform

A working prototype demonstrating how AI-assisted engineering (Devin) can replace the
*internal tools* use case of Microsoft Power Apps: a thin shared platform plus small
purpose-built apps on top of it — here, the exact three apps the client runs today.

**Total build time: ~2 hours with Devin.**

## What's inside

**The platform layer** (built once, reused by every future app):

- Signed-cookie session auth with PBKDF2-hashed passwords
- Role-based access control: `agent` < `lead` < `admin`
- A shared app shell (sidebar nav, user context) every app inherits
- A single audit table that records *every* mutating action across all apps,
  viewable at `/audit` by leads and admins

**The three apps**, replicating their current Power Apps:

| App | Route | What it does |
|---|---|---|
| KYC Review Queue | `/apps/kyc` | Filterable case queue → case detail → approve/reject. **High-risk cases require maker-checker dual control**: a second, different reviewer must sign off. Self-approval is blocked. |
| Refunds Dashboard | `/apps/refunds` | Pending-exposure summary, filterable refund table, inline approve/deny. **Refunds ≥ $500 require a lead** — agents are blocked server-side. |
| Feature Flags | `/apps/flags` | Flag list, create flag, enable/disable. **Lead/admin only**; every toggle writes an audit event with actor and timestamp. |

Plus an **Overview dashboard** (`/`) with live counts across all apps.

## Run it

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000
# open http://localhost:8000
```

SQLite database and seed data (14 KYC cases, 12 refunds, 6 flags, 3 users) are
created automatically on first start. Delete `internalops.db` to reset.

**Demo users** (password: `password`):

- `analyst@fintech.dev` — role `agent`: can review low/medium KYC cases, decide refunds < $500
- `lead@fintech.dev` — role `lead`: second KYC review, high-value refunds, flag toggles, audit log
- `admin@fintech.dev` — role `admin`: same as lead (extend with user management later)

## Try the important flows

1. Sign in as `analyst@` → open a **high-risk** KYC case → Approve.
   Status becomes `awaiting second review`. Try to approve it again → blocked (dual control).
2. Sign in as `lead@` → same case → Confirm approval → `approved`. Check `/audit`.
3. As `analyst@` → try to approve a refund marked `HV` → rejected, needs a lead.
4. As `lead@` → toggle a feature flag → appears in `/audit` with your name and timestamp.

## Deliberate scope choices (and honest limits)

This is a ~2-hour proof of concept, not a production system:

- **Auth is demo-grade.** Real deployment = OIDC/SSO (Okta, Entra ID) — a standard
  library integration, not a platform feature you'd miss.
- **SQLite** keeps the demo zero-dependency; SQLAlchemy models move to Postgres by
  changing one connection string.
- **No drag-and-drop app builder** — that's the point. Devin *generates* each new app
  on this platform in hours, which replaces the speed Power Apps gets from low-code,
  while giving you real code, real tests, and Git history.
- Server-rendered UI on purpose: internal tools don't need a SPA. If a future app
  does, nothing here prevents it.

## The pattern for the next 10 apps

Each new tool = a new module under `app/apps/` + a nav entry. Auth, RBAC, audit,
and the shell are already done. This is the same "platform + apps" structure Power
Apps gives you — except the platform is 300 lines of code you own, instead of a
$250K/year license.
