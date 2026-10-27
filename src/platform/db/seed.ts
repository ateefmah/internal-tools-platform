import { db } from "./index";
import { charges, refunds } from "./schema";
import { makeIdempotencyKey } from "../idempotency";

// Synthetic data only. Never real PII.
export function seedIfEmpty() {
  if (db.select().from(charges).all().length > 0) return;
  const now = new Date().toISOString();

  db.insert(charges)
    .values([
      { ref: "ch_1042", customerRef: "cus_9f2k1", email: "a.smith@example.test", amountCents: 4200, status: "open", createdAt: now },
      { ref: "ch_1055", customerRef: "cus_31mxx", email: "j.doe@example.test", amountCents: 25000, status: "open", createdAt: now },
      { ref: "ch_1061", customerRef: "cus_77qaa", email: "k.wong@example.test", amountCents: 780000, status: "open", createdAt: now },
      { ref: "ch_1077", customerRef: "cus_02vbn", email: "m.ali@example.test", amountCents: 8000, status: "open", createdAt: now },
      { ref: "ch_1080", customerRef: "cus_55plq", email: "r.chen@example.test", amountCents: 12000, status: "open", createdAt: now },
      { ref: "ch_1091", customerRef: "cus_88wdz", email: "s.park@example.test", amountCents: 6000, status: "refunded", createdAt: now },
    ])
    .run();

  // A paid refund and a pending one requested by Priya — so the self-approval
  // block is demonstrable out of the box.
  db.insert(refunds)
    .values([
      { chargeId: 6, amountCents: 6000, reasonCode: "duplicate_charge", status: "paid", requestedBy: "Sam Rivera", decidedBy: "Sam Rivera", idempotencyKey: makeIdempotencyKey([6, 6000, "duplicate_charge", "Sam Rivera"]), createdAt: now },
      { chargeId: 3, amountCents: 780000, reasonCode: "service_outage", status: "pending_approval", requestedBy: "Priya Nair", decidedBy: null, idempotencyKey: makeIdempotencyKey([3, 780000, "service_outage", "Priya Nair"]), createdAt: now },
    ])
    .run();
}
