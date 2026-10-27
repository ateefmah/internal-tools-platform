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
    slug: "signin",
    name: "Sign in",
    kind: "platform",
    description: "Mock of company SSO — picks a synthetic persona.",
    owner: "platform",
    status: "live",
  },
  {
    slug: "audit",
    name: "Audit log",
    kind: "platform",
    description: "Append-only record of every write on the platform.",
    owner: "platform",
    status: "live",
  },
  {
    slug: "requests",
    name: "Tool requests",
    kind: "platform",
    description: "Intake for new internal-tool requests from ops.",
    owner: "platform",
    status: "live",
  },
  {
    slug: "refunds",
    name: "Refunds",
    kind: "app",
    description: "Search charges and issue refunds with role limits and approvals.",
    owner: "finance",
    status: "live",
  },
  {
    slug: "kyc",
    name: "KYC review queue",
    kind: "app",
    description: "Claim, review and escalate customer verification cases.",
    owner: "compliance",
    status: "live",
  },
  {
    slug: "chargebacks",
    name: "Chargebacks",
    kind: "app",
    description: "Track card disputes, evidence and response deadlines.",
    owner: "ops",
    status: "live",
  },
  {
    slug: "payout-holds",
    name: "Payout holds",
    kind: "app",
    description: "Place and release merchant payout holds; large releases need finance sign-off.",
    owner: "ops",
    status: "live",
    origin: "requested in plain English by ops (tool_requests intake)",
  },
];
