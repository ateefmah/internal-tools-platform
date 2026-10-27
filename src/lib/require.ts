import { currentPersona, type Persona } from "./personas";

// Control 1: every write route must call this (or requirePermission) server-side
// before touching the database. Enforced structurally by tests/controls.spec.ts.
export async function requireRole(roles: string[]): Promise<Persona> {
  const persona = await currentPersona();
  if (!roles.includes(persona.role)) {
    throw new Error(
      `forbidden: ${persona.role} lacks required role (${roles.join(", ")})`
    );
  }
  return persona;
}

export async function requirePermission(perm: string): Promise<Persona> {
  const persona = await currentPersona();
  if (!persona.permissions.includes(perm)) {
    throw new Error(`forbidden: ${persona.role} lacks permission ${perm}`);
  }
  return persona;
}

// Control 3: maker-checker. The requester can never approve their own request.
export function assertNotSelfApproval(requestedBy: string, actor: Persona) {
  if (requestedBy === actor.name) {
    throw new Error("self_approval_forbidden: requester cannot approve own request");
  }
}
