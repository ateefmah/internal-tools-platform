import { auditLog } from "./db/schema";

// Control 2: callers pass the open transaction handle, so the audit row
// commits atomically with the write. audit_log has no update/delete path.
interface AuditWriter {
  insert(
    table: typeof auditLog
  ): { values(v: typeof auditLog.$inferInsert): { run(): unknown } };
}

export type AuditEntry = {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  detail?: string;
};

export const audit = {
  record(db: AuditWriter, entry: AuditEntry) {
    db.insert(auditLog)
      .values({
        ...entry,
        detail: entry.detail ?? "",
        createdAt: new Date().toISOString(),
      })
      .run();
  },
};
