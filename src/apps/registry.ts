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
    description: "Search charges and refund with a reason code; per-role limits and maker-checker.",
    owner: "finance",
    status: "live",
    origin: "playbook",
  },
  {
    slug: "audit",
    name: "Audit Log",
    kind: "platform",
    description: "Append-only record of every controlled write.",
    owner: "engineering",
    status: "live",
  },
  {
    slug: "sign-in",
    name: "Sign in",
    kind: "platform",
    description: "Mock SSO persona sign-in for the demo.",
    owner: "engineering",
    status: "live",
  },
];
