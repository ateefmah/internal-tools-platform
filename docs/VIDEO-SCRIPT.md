# Loom script — ~5 min, for the client's VP of Engineering

*~700 words at conversational pace. Demo segments in brackets are B-roll: record the app
while narrating, or pause and drive it live.*

## 1. What Power Apps actually is (≈60s)

Before recommending anything, credit where it's due. Power Apps isn't really an app
builder — it's a **platform**: managed identity through Entra, role-based access,
Dataverse for data with row-level security, environments and ALM, 200+ connectors,
and a mobile runtime. What you're paying $250K for is mostly that platform layer plus
the speed of not writing code. For three apps that's expensive; for thirteen it gets
worse, because pricing is per-user — every ops analyst you add grows the bill.

## 2. What we built instead (≈90s)

[B-roll: log in as analyst → home dashboard → open KYC queue]

I had Devin build the same shape as Power Apps — a thin platform with apps on top —
in about two hours. The platform owns what the platform should: session auth,
three roles (agent, lead, admin), and a single audit trail every app writes into.

On top of it, the exact three apps you run today. The KYC queue isn't just CRUD —
**high-risk cases require maker-checker dual control**.

[B-roll: analyst approves high-risk case → "awaiting second review"; try to self-approve → blocked;
switch to lead → confirm → approved; open audit log]

Watch the audit log: every action, every actor, timestamped. The refunds app
enforces a $500 threshold — analysts can't approve above it, leads can. Feature
flags are lead/admin only and every toggle is audited. These are the controls a
fintech actually gets audited on, and in code they're ten lines each.

## 3. Honest assessment (≈90s)

What's fully replicable: CRUD-with-policy apps — queues, dashboards, admin panels,
approval workflows. That's most internal tooling, and Devin generates each new one
in hours on this platform, which is how you replace "low-code makes it fast."

What's genuinely not replicated: **the connector marketplace** — two hundred
plug-and-play integrations is the underpriced part of the license, and each real
integration becomes bespoke API work, even with Devin writing it. **Mobile runtime
and accessibility** come free in Power Apps; you'd build them. **Citizen
development** — if your ops team wants to build tools themselves, this model
doesn't give them that; every app goes through engineering, even if the engineer
is Devin. And you inherit Microsoft's compliance umbrella today; building means
owning the auth, hosting, and SOC-2 evidence yourself.

The real risks are maintenance discipline — these become real software that needs
ownership — and integration sprawl if the tools touch many external systems.

## 4. Recommendation (≈60s)

**Build, with a hybrid caveat.** For a 60-engineer fintech, the three apps shown —
and most of the ten planned — are exactly the pattern this platform handles:
auth'd, audited, policy-driven workflow tools. You already run Git and code review,
so governance is free — every tool is a reviewed PR, not an ungoverned low-code
sprawl, which is Power Platform's known problem at scale.

Keep Power Apps — or negotiate it down to a small footprint — only where it earns
its license: apps that need the connector marketplace, mobile, or business-user
authorship. The $250K drops to a fraction, not zero, on day one — and toward zero
as the backlog moves over.

## 5. Next steps (≈30s)

If you proceed: start with one tool — I'd pick the KYC queue since it's shown
here — have Devin harden it for production (OIDC, Postgres, deploy it beside your
existing stack), and run it in parallel for a month. If the team trusts it, retire
apps one by one. Devin's role is exactly what it was here: generating each new app
on the platform in hours, and being your maintenance loop — upgrading, fixing,
and extending tools as normal pull requests.
