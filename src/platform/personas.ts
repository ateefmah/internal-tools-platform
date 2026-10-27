import { cookies } from "next/headers";

// MOCK SSO: persona switching simulates company identity. Real SSO is out of
// scope per SPEC.md — the sign-in page and badge are labeled as a mock.
export type Persona = {
  id: string;
  name: string;
  role: string;
  permissions: string[];
  blurb: string;
};

export const PERSONAS: Persona[] = [
  {
    id: "support",
    name: "Sam Rivera",
    role: "support_agent",
    permissions: ["refund:request"],
    blurb: "Support — refunds up to $100",
  },
  {
    id: "finance-priya",
    name: "Priya Nair",
    role: "finance_manager",
    permissions: ["refund:request", "refund:approve", "pii:reveal"],
    blurb: "Finance — refunds up to $5,000, approves larger",
  },
  {
    id: "finance-jordan",
    name: "Jordan Lee",
    role: "finance_manager",
    permissions: ["refund:request", "refund:approve", "pii:reveal"],
    blurb: "Finance — refunds up to $5,000, approves larger",
  },
];

export async function currentPersona(): Promise<Persona | null> {
  const jar = await cookies();
  const id = jar.get("persona")?.value;
  return PERSONAS.find((p) => p.id === id) ?? null;
}

export function personaById(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}
