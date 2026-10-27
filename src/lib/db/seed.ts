import * as schema from "./schema";
import type { db } from "./index";

// Synthetic data only — never real customer data (AGENTS.md).
export function seed(d: typeof db) {
  const now = new Date();
  const iso = (d2: Date) => d2.toISOString();
  const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 86400_000));
  const daysFromNow = (n: number) =>
    iso(new Date(now.getTime() + n * 86400_000)).slice(0, 10);

  d.insert(schema.users)
    .values([
      { id: "u-sam", name: "Sam Ortiz", role: "support_agent", email: "sam.ortiz@example.com" },
      { id: "u-fay", name: "Fay Iyer", role: "finance_manager", email: "fay.iyer@example.com" },
      { id: "u-priya", name: "Priya Nair", role: "finance_manager", email: "priya.nair@example.com" },
      { id: "u-ken", name: "Ken Bale", role: "kyc_analyst", email: "ken.bale@example.com" },
      { id: "u-kim", name: "Kim Zhao", role: "kyc_senior", email: "kim.zhao@example.com" },
      { id: "u-tom", name: "Tom Aldridge", role: "ops_manager", email: "tom.aldridge@example.com" },
      { id: "u-dana", name: "Dana Cole", role: "engineer", email: "dana.cole@example.com" },
    ])
    .run();

  d.insert(schema.charges)
    .values([
      { id: "ch-1001", customerName: "Aster Bakery", amountCents: 4_200, createdAt: daysAgo(9) },
      { id: "ch-1002", customerName: "Bluefin Logistics", amountCents: 18_950, createdAt: daysAgo(8) },
      { id: "ch-1003", customerName: "Copper Kettle Cafe", amountCents: 9_900, createdAt: daysAgo(7) },
      { id: "ch-1004", customerName: "Delta Freight", amountCents: 310_000, createdAt: daysAgo(5) },
      { id: "ch-1005", customerName: "Elm Street Grocer", amountCents: 7_450, createdAt: daysAgo(4) },
      { id: "ch-1006", customerName: "Foxglove Studio", amountCents: 780_000, createdAt: daysAgo(3) },
      { id: "ch-1007", customerName: "Granite Supplies", amountCents: 52_300, createdAt: daysAgo(2) },
      { id: "ch-1008", customerName: "Harbor Dental", amountCents: 12_100, createdAt: daysAgo(1) },
    ])
    .run();

  d.insert(schema.refunds)
    .values([
      {
        id: "rf-5001",
        chargeId: "ch-1008",
        amountCents: 12_100,
        reasonCode: "duplicate_charge",
        status: "completed",
        requestedBy: "u-sam",
        decidedBy: null,
        idempotencyKey: "seed-rf-5001",
        createdAt: daysAgo(1),
        decidedAt: daysAgo(1),
      },
    ])
    .run();

  d.insert(schema.kycCases)
    .values([
      { id: "kyc-2001", customerName: "Ines Marek", taxId: "123-45-6789", country: "DE", riskLevel: "low", status: "open", claimedBy: null, escalatedBy: null, decidedBy: null, createdAt: daysAgo(6) },
      { id: "kyc-2002", customerName: "Owen Rusk", taxId: "987-65-4321", country: "US", riskLevel: "high", status: "open", claimedBy: null, escalatedBy: null, decidedBy: null, createdAt: daysAgo(5) },
      { id: "kyc-2003", customerName: "Paloma Reyes", taxId: "555-12-0098", country: "MX", riskLevel: "medium", status: "claimed", claimedBy: "u-ken", escalatedBy: null, decidedBy: null, createdAt: daysAgo(4) },
      { id: "kyc-2004", customerName: "Quentin Vale", taxId: "441-90-2211", country: "GB", riskLevel: "high", status: "open", claimedBy: null, escalatedBy: null, decidedBy: null, createdAt: daysAgo(3) },
      { id: "kyc-2005", customerName: "Rosa Lindt", taxId: "332-14-8870", country: "SE", riskLevel: "low", status: "info_requested", claimedBy: "u-ken", escalatedBy: null, decidedBy: null, createdAt: daysAgo(2) },
      { id: "kyc-2006", customerName: "Sten Holt", taxId: "778-03-5544", country: "NO", riskLevel: "medium", status: "open", claimedBy: null, escalatedBy: null, decidedBy: null, createdAt: daysAgo(1) },
    ])
    .run();

  d.insert(schema.chargebacks)
    .values([
      { id: "cb-3001", merchant: "Bluefin Logistics", amountCents: 42_000, networkReasonCode: "10.4 - Fraud", deadline: daysFromNow(2), status: "open", createdBy: "u-tom", signedOffBy: null, createdAt: daysAgo(6) },
      { id: "cb-3002", merchant: "Delta Freight", amountCents: 98_500, networkReasonCode: "13.1 - Merchandise not received", deadline: daysFromNow(9), status: "open", createdBy: "u-tom", signedOffBy: null, createdAt: daysAgo(4) },
      { id: "cb-3003", merchant: "Granite Supplies", amountCents: 15_200, networkReasonCode: "12.5 - Incorrect amount", deadline: daysFromNow(1), status: "pending_signoff", createdBy: "u-tom", signedOffBy: null, createdAt: daysAgo(3) },
    ])
    .run();

  d.insert(schema.chargebackNotes)
    .values([
      { chargebackId: "cb-3003", author: "u-tom", body: "Merchant says invoice was adjusted after settlement; pulling the original order record.", createdAt: daysAgo(2) },
    ])
    .run();

  d.insert(schema.payoutHolds)
    .values([
      { id: "ph-4001", merchant: "Copper Kettle Cafe", amountCents: 31_000, reason: "Chargeback spike this week", placedBy: "u-tom", status: "held", releasedBy: null, createdAt: daysAgo(5) },
      { id: "ph-4002", merchant: "Foxglove Studio", amountCents: 1_240_000, reason: "New merchant, first payout review", placedBy: "u-tom", status: "held", releasedBy: null, createdAt: daysAgo(3) },
      { id: "ph-4003", merchant: "Elm Street Grocer", amountCents: 8_800, reason: "Duplicate payout suspected", placedBy: "u-tom", status: "held", releasedBy: null, createdAt: daysAgo(2) },
    ])
    .run();

  d.insert(schema.toolRequests)
    .values([
      {
        requester: "u-tom",
        summary:
          "Track payout holds on merchants: who placed the hold, the reason, the amount held, and a release button. Releases over $10K should need a finance manager to approve.",
        status: "shipped",
        createdAt: daysAgo(4),
      },
      {
        requester: "u-tom",
        summary: "Page listing card programs expiring in the next 30 days — compliance keeps missing renewals.",
        status: "new",
        createdAt: daysAgo(1),
      },
    ])
    .run();
}
