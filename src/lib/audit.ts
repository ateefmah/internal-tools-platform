import { schema } from "./db";

// The transaction type drizzle hands to db.transaction callbacks. Callers must
// pass their open tx so the audit row commits or rolls back with the write.
export type Tx = Parameters<Parameters<
  typeof import("./db").db.transaction
>[0]>[0];

export type AuditEntry = {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  detail?: string;
};

export const audit = {
  record(tx: Tx, entry: AuditEntry) {
    tx.insert(schema.auditLog)
      .values({
        actor: entry.actor,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        detail: entry.detail ?? "",
        createdAt: new Date().toISOString(),
      })
      .run();
  },
};
