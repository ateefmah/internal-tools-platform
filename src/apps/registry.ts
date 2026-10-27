// Every app must be registered here (Definition of Done).
// tests/controls.spec.ts fails CI if a route directory has no registry entry.
export type RegisteredApp = {
  slug: string;
  name: string;
  kind: "app" | "platform";
  description: string;
  owner: string;
  status: "live" | "in_build";
  origin?: string;
};

export const APPS: RegisteredApp[] = [
  {
    slug: "refunds",
    name: "Refunds",
    kind: "app",
    description: "Issue and approve refunds with per-role limits and maker-checker on large amounts.",
    owner: "finance",
    status: "live",
    origin: "playbook",
  },
  {
    slug: "kyc",
    name: "KYC Review Queue",
    kind: "app",
    description: "Analyst first-pass decisions; high-risk cases need a second reviewer.",
    owner: "compliance",
    status: "live",
    origin: "playbook",
  },
  {
    slug: "chargebacks",
    name: "Chargebacks",
    kind: "app",
    description: "Contest and resolve card chargebacks; resolver differs from contester.",
    owner: "finance",
    status: "live",
    origin: "playbook",
  },
  {
    slug: "expiry-alerts",
    name: "Expiry Alerts",
    kind: "app",
    description: "Card programs expiring within 30 days, flagged for compliance.",
    owner: "compliance",
    status: "live",
    origin: "slack-request (docs/slack-request.md)",
  },
  {
    slug: "requests",
    name: "Tool Requests",
    kind: "platform",
    description: "Intake queue: describe a tool in plain English, engineering triages it.",
    owner: "engineering",
    status: "live",
  },
  {
    slug: "audit",
    name: "Audit Log",
    kind: "platform",
    description: "Append-only record of every controlled write across all apps.",
    owner: "engineering",
    status: "live",
  },
];
