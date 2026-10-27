"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission, assertNotSelfApproval, Forbidden } from "@/lib/require";
import { revalidatePath } from "next/cache";

const SUPPORT_LIMIT_CENTS = 10_000; // $100
const FINANCE_LIMIT_CENTS = 500_000; // $5,000

export async function requestRefund(formData: FormData) {
  const user = await requirePermission("refund.create");
  const chargeId = String(formData.get("chargeId"));
  const reasonCode = String(formData.get("reasonCode") ?? "");
  const idempotencyKey = String(formData.get("idem") ?? "");
  if (!reasonCode) throw new Forbidden("Pick a reason code.");
  if (!idempotencyKey) throw new Forbidden("Missing idempotency key.");

  const charge = db
    .select()
    .from(schema.charges)
    .where(eq(schema.charges.id, chargeId))
    .get();
  if (!charge) throw new Forbidden("Charge not found.");
  if (charge.status === "refunded")
    throw new Forbidden("This charge was already refunded.");

  const overSupport = charge.amountCents > SUPPORT_LIMIT_CENTS;
  const overFinance = charge.amountCents > FINANCE_LIMIT_CENTS;

  if (overFinance && !user.role.match(/finance_manager|engineer/)) {
    throw new Forbidden(
      "Refunds over $5,000 always need a finance manager to request them."
    );
  }
  if (overSupport && user.role === "support_agent") {
    throw new Forbidden(
      "Support agents can refund up to $100. This one needs a finance manager."
    );
  }

  const needsApproval = overFinance;
  const refundId = `rf-${Date.now()}`;

  try {
    db.transaction((tx) => {
      tx.insert(schema.refunds)
        .values({
          id: refundId,
          chargeId: charge.id,
          amountCents: charge.amountCents,
          reasonCode,
          status: needsApproval ? "pending_approval" : "completed",
          requestedBy: user.id,
          decidedBy: null,
          idempotencyKey,
          createdAt: new Date().toISOString(),
          decidedAt: needsApproval ? null : new Date().toISOString(),
        })
        .run();
      if (!needsApproval) {
        tx.update(schema.charges)
          .set({ status: "refunded" })
          .where(eq(schema.charges.id, charge.id))
          .run();
      }
      audit.record(tx, {
        actor: user.id,
        action: needsApproval ? "refund.requested" : "refund.issued",
        entityType: "refund",
        entityId: refundId,
        detail: `${charge.id} $${(charge.amountCents / 100).toFixed(2)} ${reasonCode}`,
      });
    });
  } catch (e) {
    if (String(e).includes("UNIQUE")) {
      // Same idempotency key = same request retried. Not a second refund.
      throw new Forbidden("This refund was already submitted (idempotent retry).");
    }
    throw e;
  }
  revalidatePath("/refunds");
}

export async function approveRefund(formData: FormData) {
  const user = await requirePermission("refund.approve");
  const refundId = String(formData.get("refundId"));
  const decision = String(formData.get("decision"));

  const refund = db
    .select()
    .from(schema.refunds)
    .where(eq(schema.refunds.id, refundId))
    .get();
  if (!refund || refund.status !== "pending_approval")
    throw new Forbidden("Nothing pending on this refund.");

  assertNotSelfApproval(user.id, refund.requestedBy);

  db.transaction((tx) => {
    if (decision === "approve") {
      tx.update(schema.refunds)
        .set({ status: "completed", decidedBy: user.id, decidedAt: new Date().toISOString() })
        .where(eq(schema.refunds.id, refundId))
        .run();
      tx.update(schema.charges)
        .set({ status: "refunded" })
        .where(eq(schema.charges.id, refund.chargeId))
        .run();
      audit.record(tx, {
        actor: user.id,
        action: "refund.approved",
        entityType: "refund",
        entityId: refundId,
        detail: `second approver for ${refund.requestedBy}`,
      });
    } else {
      tx.update(schema.refunds)
        .set({ status: "rejected", decidedBy: user.id, decidedAt: new Date().toISOString() })
        .where(eq(schema.refunds.id, refundId))
        .run();
      audit.record(tx, {
        actor: user.id,
        action: "refund.rejected",
        entityType: "refund",
        entityId: refundId,
      });
    }
  });
  revalidatePath("/refunds");
}
