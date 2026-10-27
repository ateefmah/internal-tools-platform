import { db } from "./db";
import { audit } from "./audit";
import { requirePermission } from "./require";

// Control 4 continued: revealing PII requires the pii:reveal permission and
// writes an audit entry. Called from server components when ?reveal=<field>
// is present.
export async function revealPII(
  entityType: string,
  entityId: string,
  field: string,
  value: string
): Promise<string> {
  const actor = await requirePermission("pii:reveal");
  audit.record(db, {
    actor: actor.name,
    action: "pii.reveal",
    entityType,
    entityId,
    detail: `field=${field}`,
  });
  return value;
}
