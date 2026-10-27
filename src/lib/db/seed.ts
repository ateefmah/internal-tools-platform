import { db } from "./index";
import {
  refunds,
  kycCases,
  chargebacks,
  expiringItems,
  toolRequests,
} from "./schema";

// Synthetic data only. Never real PII.
export function seedIfEmpty() {
  if (db.select().from(refunds).all().length > 0) return;

  const now = new Date().toISOString();

  db.insert(refunds)
    .values([
      { customerRef: "cus_9f2k1", amountCents: 4200, reason: "Duplicate charge", status: "paid", requestedBy: "Sam Rivera", decidedBy: "Sam Rivera", createdAt: now },
      { customerRef: "cus_31mxx", amountCents: 25000, reason: "Service outage credit", status: "pending_approval", requestedBy: "Sam Rivera", decidedBy: null, createdAt: now },
      { customerRef: "cus_77qaa", amountCents: 780000, reason: "Wire sent twice", status: "pending_approval", requestedBy: "Priya Nair", decidedBy: null, createdAt: now },
      { customerRef: "cus_02vbn", amountCents: 9500, reason: "Plan downgrade proration", status: "rejected", requestedBy: "Sam Rivera", decidedBy: "Priya Nair", createdAt: now },
    ])
    .run();

  db.insert(kycCases)
    .values([
      { applicantRef: "app_1001", risk: "high", status: "awaiting_second_review", email: "j.doe@example.test", taxId: "000-12-3456", decisionNote: "Docs check out; PEP match needs a second set of eyes.", firstDecisionBy: "Diego Fuentes", decidedBy: null, createdAt: now },
      { applicantRef: "app_1002", risk: "medium", status: "queued", email: "a.smith@example.test", taxId: "000-98-7654", decisionNote: null, firstDecisionBy: null, decidedBy: null, createdAt: now },
      { applicantRef: "app_1003", risk: "low", status: "queued", email: "k.wong@example.test", taxId: "000-55-1212", decisionNote: null, firstDecisionBy: null, decidedBy: null, createdAt: now },
      { applicantRef: "app_1004", risk: "high", status: "queued", email: "m.ali@example.test", taxId: "000-44-9090", decisionNote: null, firstDecisionBy: null, decidedBy: null, createdAt: now },
    ])
    .run();

  db.insert(chargebacks)
    .values([
      { txnRef: "txn_88cv1", amountCents: 13400, reasonCode: "10.4 fraud", status: "open", contestedBy: null, resolvedBy: null, createdAt: now },
      { txnRef: "txn_55tb9", amountCents: 80200, reasonCode: "13.1 services not received", status: "contested", contestedBy: "Sam Rivera", resolvedBy: null, createdAt: now },
      { txnRef: "txn_20kl4", amountCents: 45900, reasonCode: "10.4 fraud", status: "won", contestedBy: "Sam Rivera", resolvedBy: "Priya Nair", createdAt: now },
    ])
    .run();

  db.insert(expiringItems)
    .values([
      { program: "Fleet cards EU", detail: "Card program agreement renewal", daysLeft: 9, severity: "urgent" },
      { program: "Corporate travel cards", detail: "Issuing processor cert expiry", daysLeft: 21, severity: "warning" },
      { program: "Vendor payout cards", detail: "Program BIN sponsorship review", daysLeft: 28, severity: "warning" },
    ])
    .run();

  db.insert(toolRequests)
    .values([
      { requestText: "Can we get a page listing card programs expiring in the next 30 days? Compliance keeps missing renewals.", requestedBy: "Tom Aldridge", status: "shipped", triagedBy: "Rin Kato", createdAt: now },
    ])
    .run();
}
