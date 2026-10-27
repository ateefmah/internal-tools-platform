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

export const APPS: RegisteredApp[] = [];
