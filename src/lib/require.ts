import { getCurrentUser, PERMISSIONS, ROLE_LABELS, type User } from "./auth";

export class Forbidden extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Forbidden";
  }
}

// Every write path calls one of these before touching the database.
// tests/controls.spec.ts scans for these calls, so they cannot be skipped.
export async function requireRole(...roles: string[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Forbidden("Sign in to do this.");
  if (!roles.includes(user.role)) {
    throw new Forbidden(
      `${user.name} is a ${ROLE_LABELS[user.role] ?? user.role} — this action needs ${roles
        .map((r) => ROLE_LABELS[r] ?? r)
        .join(" or ")}.`
    );
  }
  return user;
}

export async function requirePermission(permission: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Forbidden("Sign in to do this.");
  const allowed = PERMISSIONS[user.role] ?? [];
  if (!allowed.includes(permission)) {
    throw new Forbidden(
      `${user.name} doesn't have the "${permission}" permission. Ask a platform admin if that looks wrong.`
    );
  }
  return user;
}

// Maker-checker: the person who requested a thing can never approve it.
export function assertNotSelfApproval(actorId: string, requesterId: string) {
  if (actorId === requesterId) {
    throw new Forbidden(
      "Maker-checker: you can't approve a request you made yourself. A second person has to sign off."
    );
  }
}
