# SPEC: internal tools platform prototype

Client: Series C fintech, ~60 engineers, $250K/yr on Power Apps.
Three apps today (KYC queue, refunds dashboard, feature-flag admin),
10+ planned. Question: can the team build these with Devin instead?

Goal: show how app #N gets requested, built, reviewed and maintained
safely, with controls enforced by CI rather than memory.

In scope
- Platform controls: roles, append-only audit, maker-checker, PII masking
- Conformance test that fails CI if any write skips a control
- Refunds (careful), KYC queue and Chargebacks (from the playbook)
- One app built from a plain-English Slack request
- A weekly maintenance schedule

Out of scope
- Real SSO and deployment (documented, not built)
- Feature-flag panel (use the flag vendor's UI)
- Drag-and-drop builder

Personas
support agent (refunds up to $100), finance manager (up to $5,000,
approves larger ones), KYC analyst, KYC senior, ops manager
(requests tools), engineer.

Time box: 2 hours of build.
