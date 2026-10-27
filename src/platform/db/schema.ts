import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Append-only. Never update or delete rows here; the conformance test enforces it.
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const charges = sqliteTable("charges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ref: text("ref").notNull(),
  customerRef: text("customer_ref").notNull(),
  email: text("email").notNull(), // PII, masked in UI
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull(), // open | refunded
  createdAt: text("created_at").notNull(),
});

export const refunds = sqliteTable("refunds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chargeId: integer("charge_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  reasonCode: text("reason_code").notNull(),
  status: text("status").notNull(), // paid | pending_approval | approved | rejected
  requestedBy: text("requested_by").notNull(),
  decidedBy: text("decided_by"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
