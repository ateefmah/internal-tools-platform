"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { audit } from "./audit";
import { requirePermission } from "./require";

// The only way a page sees raw PII. Requires the pii.reveal permission and
// writes an audit row in the same transaction as the read is justified.
// Returns null when the caller lacks the permission — pages keep the mask.
export async function revealPII(
  entityType: string,
  entityId: string,
  field: "taxId" | "email"
): Promise<string> {
  const user = await requirePermission("pii.reveal");

  let value = "";
  if (entityType === "kyc_case" && field === "taxId") {
    const row = db
      .select()
      .from(schema.kycCases)
      .where(eq(schema.kycCases.id, entityId))
      .get();
    value = row?.taxId ?? "";
  } else if (entityType === "user" && field === "email") {
    const row = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, entityId))
      .get();
    value = row?.email ?? "";
  }

  db.transaction((tx) => {
    audit.record(tx, {
      actor: user.id,
      action: "pii.reveal",
      entityType,
      entityId,
      detail: `revealed ${field}`,
    });
  });

  return value;
}
