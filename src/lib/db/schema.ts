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

export const refunds = sqliteTable("refunds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerRef: text("customer_ref").notNull(),
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull(), // paid | pending_approval | approved | rejected
  requestedBy: text("requested_by").notNull(),
  decidedBy: text("decided_by"),
  createdAt: text("created_at").notNull(),
});

export const kycCases = sqliteTable("kyc_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicantRef: text("applicant_ref").notNull(),
  risk: text("risk").notNull(), // low | medium | high
  status: text("status").notNull(), // queued | awaiting_second_review | approved | rejected
  email: text("email").notNull(), // PII, masked in UI
  taxId: text("tax_id").notNull(), // PII, masked in UI
  decisionNote: text("decision_note"),
  firstDecisionBy: text("first_decision_by"),
  decidedBy: text("decided_by"),
  createdAt: text("created_at").notNull(),
});

export const chargebacks = sqliteTable("chargebacks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  txnRef: text("txn_ref").notNull(),
  amountCents: integer("amount_cents").notNull(),
  reasonCode: text("reason_code").notNull(),
  status: text("status").notNull(), // open | contested | won | lost
  contestedBy: text("contested_by"),
  resolvedBy: text("resolved_by"),
  createdAt: text("created_at").notNull(),
});

export const toolRequests = sqliteTable("tool_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestText: text("request_text").notNull(),
  requestedBy: text("requested_by").notNull(),
  status: text("status").notNull(), // new | in_build | shipped | rejected
  triagedBy: text("triaged_by"),
  createdAt: text("created_at").notNull(),
});

export const expiringItems = sqliteTable("expiring_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  program: text("program").notNull(),
  detail: text("detail").notNull(),
  daysLeft: integer("days_left").notNull(),
  severity: text("severity").notNull(), // warning | urgent
});
