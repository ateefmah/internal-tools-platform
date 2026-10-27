# Power Apps research for the build-vs-buy decision

Client context: Series C fintech, ~60 engineers, ~$250K/year for Power Apps. Three
apps in production (KYC review queue, refunds dashboard, feature-flag admin), 10+
planned. Most app users are ops, support, compliance and finance staff, not engineers.
Every factual claim below cites a source; all links were checked on 2026-10-27.
Items I could not verify are marked *unverified*.

## 1. What Power Apps actually provides

Power Apps is less an app builder than a managed platform. The valuable parts for
this client:

- **Identity**: every environment lives under a Microsoft Entra tenant and only
  users in that tenant can reach its resources, so Entra SSO, MFA and conditional
  access come free [1].
- **Three app types**: canvas apps (blank-canvas UI on 200+ connectors),
  model-driven apps (UI generated from the Dataverse schema: forms, views,
  business rules) and, in preview, code apps (host a React/Vue app built in a
  normal IDE inside Power Platform, keeping platform capabilities) [2][3].
- **Dataverse**: a managed data platform with security roles (record-level
  privileges plus team/owner scoping) and column-level security for sensitive
  fields like bank details or government IDs [4][5].
- **Auditing**: Dataverse auditing logs record create/update/delete, sharing
  changes, deletes of audit logs, and user access, with per-record history and a
  summary view [6].
- **Data loss prevention**: tenant- and environment-level policies classify
  connectors as business, non-business or blocked and control which connectors
  may be combined in one app [7].
- **Environments and ALM**: environments are geo-bound containers for dev, test
  and prod; Managed Environments add premium governance such as deployment
  pipelines, sharing limits, IP firewall, customer-managed keys, usage insights
  and per-app conditional access [1][8].

## 2. Licensing

- **Today**: Power Apps Premium is $20 per user/month billed annually [9].
- **January 1, 2027**: Premium rises $2 to $22; the 2,000-seat tier goes $12 to
  $14. Applies to new purchases, renewals and co-terms starting on or after that
  date, so the client's price depends on their renewal date [10].
- **February 2027**: Microsoft tightens license enforcement. Apps in managed
  environments, all model-driven apps, and apps run outside a Dynamics 365
  context will refuse to open for unlicensed users [11].
- **Per-app plan**: the $5/user/app/month SKU ended for new customers on
  January 2, 2026 through EA and MPSA channels; CSP customers can still buy it.
  Pay-as-you-go (Azure-metered) remains an option for variable usage [12][13].
- **What $250K buys at list**: about 1,040 Premium users per year at $20, or
  about 945 at the 2027 price of $22. If the client has materially fewer users,
  they are paying above list, on a volume tier, or buying capacity and add-ons.
  That is worth asking, because it changes the build-vs-buy math.

## 3. The three apps on Power Apps, and where custom code is still needed

- **KYC review queue**: natural model-driven app: a case table, queue views,
  forms and a business process flow for the review stages. Maker-checker dual
  control is a two-stage Power Automate approval or a business rule; security
  roles scope which records each reviewer sees. Custom code is still needed for
  the KYC vendor integration (Onfido/Persona-style APIs mean a custom connector)
  and any rich document review UI.
- **Refunds dashboard**: canvas or model-driven list plus approve/deny buttons
  wired to a Power Automate flow. The flow must call the payment processor's
  refund API, which almost certainly means a custom connector or an Azure
  Function; threshold approval rules are trivial in Power Fx.
- **Feature-flag admin**: easy to build as a model-driven app over a flags
  table, but Power Apps can only *administer* flags. Enforcement lives in the
  product's own services, so either their code polls Dataverse/API or a flow
  pushes changes to the flag store. Either way, real code is required on the
  enforcement side; Power Apps is just the control panel.

## 4. Known weaknesses

- **Testing**: Power Fx has no mature unit-test story. Microsoft's own Test
  Engine is deprecated; the official path is now Playwright UI-test samples,
  which is weaker than ordinary code-level testing and CI [14].
- **Delegation limits**: non-delegable Power Fx queries process only the first
  500 records locally (configurable up to 10,000), so apps can silently return
  wrong results on large data unless queries are carefully designed [15].
- **Lock-in**: apps are stored in a proprietary format; source-viewable canvas
  code is a preview YAML feature, and Power Fx does not run off the platform.
  Leaving means rewriting [16].
- **Sprawl**: uncontrolled maker growth is enough of a problem that Microsoft
  publishes a Center of Excellence governance kit; it is no longer maintained
  and the capability moved into the admin center [17].
- **Commercial drift**: the per-app SKU was pulled for most new customers and
  Premium pricing is rising in 2027, so terms are a moving target [10][12].

## 5. Questions to ask the client first

1. License mix today: seat counts, SKUs, EA vs CSP, and the renewal date
   relative to the January 2027 increase and February 2027 enforcement.
2. Real user count versus the ~1,040 seats $250K implies at list price.
3. Who authors apps today: engineers, or ops analysts acting as citizen
   developers? This decides whether losing low-code speed hurts.
4. Whether apps store data in Dataverse or mostly read external systems, and
   which premium connectors are actually in use.
5. Whether auditors rely on Dataverse auditing or Microsoft compliance
   attestations today, and what evidence a self-built stack must produce.
6. Mobile or offline needs: the Power Apps mobile runtime is a real benefit that
   a web build does not automatically replace.
7. For refunds and flags: where does enforcement live, in the tool or in their
   own services via API?
8. Tolerance for owning auth, hosting, patching and audit evidence versus
   inheriting Microsoft's.

*Unverified: the assumption that $250K is seat-license spend. If it includes
Power Automate, Dataverse capacity or partner services, the seat math above
changes. No reliable third-party benchmark was found for Power Apps performance
at scale, so nothing on that is claimed.*

## Sources

1. https://learn.microsoft.com/en-us/power-platform/admin/environments-overview
2. https://learn.microsoft.com/en-us/power-apps/powerapps-overview
3. https://learn.microsoft.com/en-us/power-apps/developer/code-apps/
4. https://learn.microsoft.com/en-us/power-platform/admin/security-roles-privileges
5. https://learn.microsoft.com/en-us/power-apps/developer/data-platform/column-level-security
6. https://learn.microsoft.com/en-us/power-platform/admin/manage-dataverse-auditing
7. https://learn.microsoft.com/en-us/power-platform/guidance/adoption/dlp-strategy
8. https://learn.microsoft.com/en-us/power-platform/admin/managed-environment-overview
9. https://www.microsoft.com/en-us/power-platform/products/power-apps/pricing
10. https://www.microsoft.com/en-us/licensing/news/power-apps-premium-price-update
11. https://learn.microsoft.com/en-us/power-platform/admin/powerapps-flow-licensing-faq
12. https://www.microsoft.com/en-us/licensing/news/power-app-per-app-end-of-sale
13. https://learn.microsoft.com/en-us/power-platform/admin/pricing-billing-skus
14. https://learn.microsoft.com/en-us/power-platform/test-engine/
15. https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/delegation-overview
16. https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/power-apps-yaml
17. https://learn.microsoft.com/en-us/power-platform/guidance/coe/overview
