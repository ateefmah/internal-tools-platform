import { cookies } from "next/headers";

// MOCK SSO: persona switching simulates identity. Real SSO is out of scope per SPEC.
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
    blurb: "Support agent — refunds up to $100",
  },
  {
    id: "finance",
    name: "Priya Nair",
    role: "finance_manager",
    permissions: ["refund:request", "refund:approve", "pii:reveal"],
    blurb: "Finance manager — refunds up to $5,000, approves larger",
  },
  {
    id: "analyst",
    name: "Diego Fuentes",
    role: "kyc_analyst",
    permissions: ["kyc:decide"],
    blurb: "KYC analyst — first-pass decisions",
  },
  {
    id: "senior",
    name: "Mara Okafor",
    role: "kyc_senior",
    permissions: ["kyc:decide", "kyc:approve", "pii:reveal"],
    blurb: "KYC senior — second review on high-risk cases",
  },
  {
    id: "ops",
    name: "Tom Aldridge",
    role: "ops_manager",
    permissions: ["tools:request"],
    blurb: "Ops manager — requests new tools",
  },
  {
    id: "engineer",
    name: "Rin Kato",
    role: "engineer",
    permissions: ["tools:request", "tools:triage", "apps:register"],
    blurb: "Engineer — triages tool requests, registers apps",
  },
];

export async function currentPersona(): Promise<Persona> {
  const jar = await cookies();
  const id = jar.get("persona")?.value;
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

export function personaById(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}
