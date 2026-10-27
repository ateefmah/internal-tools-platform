import { auditLog } from "./db/schema";

// Minimal structural type so audit.record works with either the database
// handle or a transaction handle. Control 2: callers pass the transaction
// they are writing in, so the audit row lands atomically with the write.
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
      .values({ ...entry, detail: entry.detail ?? "", createdAt: new Date().toISOString() })
      .run();
  },
};
