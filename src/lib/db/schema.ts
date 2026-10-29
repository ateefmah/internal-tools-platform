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

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull(),
});

export const charges = sqliteTable("charges", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("charged"), // charged | refunded
  createdAt: text("created_at").notNull(),
});

export const refunds = sqliteTable("refunds", {
  id: text("id").primaryKey(),
  chargeId: text("charge_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  reasonCode: text("reason_code").notNull(),
  status: text("status").notNull(), // completed | pending_approval | approved | rejected
  requestedBy: text("requested_by").notNull(),
  decidedBy: text("decided_by"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: text("created_at").notNull(),
  decidedAt: text("decided_at"),
});

export const kycCases = sqliteTable("kyc_cases", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  taxId: text("tax_id").notNull(),
  country: text("country").notNull(),
  riskLevel: text("risk_level").notNull(), // low | medium | high
  status: text("status").notNull().default("open"),
  // open | claimed | info_requested | escalated | approved | rejected
  claimedBy: text("claimed_by"),
  escalatedBy: text("escalated_by"),
  decidedBy: text("decided_by"),
  createdAt: text("created_at").notNull(),
});

export const chargebacks = sqliteTable("chargebacks", {
  id: text("id").primaryKey(),
  merchant: text("merchant").notNull(),
  amountCents: integer("amount_cents").notNull(),
  networkReasonCode: text("network_reason_code").notNull(),
  deadline: text("deadline").notNull(),
  status: text("status").notNull().default("open"), // open | pending_signoff | responded
  createdBy: text("created_by").notNull(),
  signedOffBy: text("signed_off_by"),
  createdAt: text("created_at").notNull(),
});

export const chargebackNotes = sqliteTable("chargeback_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chargebackId: text("chargeback_id").notNull(),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
});

export const payoutHolds = sqliteTable("payout_holds", {
  id: text("id").primaryKey(),
  merchant: text("merchant").notNull(),
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason").notNull(),
  placedBy: text("placed_by").notNull(),
  status: text("status").notNull().default("held"), // held | release_pending | released
  releasedBy: text("released_by"),
  createdAt: text("created_at").notNull(),
});

export const toolRequests = sqliteTable("tool_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requester: text("requester").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull().default("new"), // new | in_build | shipped | declined
  createdAt: text("created_at").notNull(),
});

export const vendorContracts = sqliteTable("vendor_contracts", {
  id: text("id").primaryKey(),
  vendor: text("vendor").notNull(),
  service: text("service").notNull(),
  ownerId: text("owner_id").notNull(),
  contactEmail: text("contact_email").notNull(),
  annualValueCents: integer("annual_value_cents").notNull(),
  renewalDate: text("renewal_date").notNull(), // YYYY-MM-DD
  noticeDays: integer("notice_days").notNull(),
  autoRenew: integer("auto_renew", { mode: "boolean" }).notNull(),
  status: text("status").notNull().default("active"), // active | decision_pending | renewed | cancelled
  decision: text("decision"), // renew | cancel
  decisionNote: text("decision_note"),
  requestedBy: text("requested_by"),
  signedOffBy: text("signed_off_by"),
  createdAt: text("created_at").notNull(),
});
