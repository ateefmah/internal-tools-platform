import { currentPersona, type Persona } from "./personas";

// Control 1: every write route must call this (or requirePermission)
// server-side before touching the database. tests/controls.spec.ts
// enforces it statically. Errors are plain words for ops users.
export async function requireRole(roles: string[]): Promise<Persona> {
  const persona = await currentPersona();
  if (!persona) throw new Error("You are not signed in.");
  if (!roles.includes(persona.role)) {
    throw new Error(
      `Your role (${persona.role.replace("_", " ")}) can't do that. ` +
        `This needs: ${roles.map((r) => r.replace("_", " ")).join(" or ")}.`
    );
  }
  return persona;
}

export async function requirePermission(perm: string): Promise<Persona> {
  const persona = await currentPersona();
  if (!persona) throw new Error("You are not signed in.");
  if (!persona.permissions.includes(perm)) {
    const what =
      perm === "refund:approve"
        ? "Only a finance manager can approve a refund."
        : perm === "pii:reveal"
          ? "You don't have permission to view private customer data."
          : `You don't have permission (${perm}).`;
    throw new Error(what);
  }
  return persona;
}

// Control 3: maker-checker. The requester can never approve their own request.
export function assertNotSelfApproval(requestedBy: string, actor: Persona) {
  if (requestedBy === actor.name) {
    throw new Error(
      "You can't approve your own request — a second approver is required."
    );
  }
}
