"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { charges, refunds } from "../db/schema";
import { audit } from "../audit";
import { requirePermission, assertNotSelfApproval } from "../require";
import { makeIdempotencyKey } from "../idempotency";
import { REASON_CODES, type ReasonCode } from "../reasons";

const AGENT_LIMIT_CENTS = 100_00; // support: up to $100
const FINANCE_LIMIT_CENTS = 5000_00; // finance manager: up to $5,000


export async function requestRefund(formData: FormData) {
  const actor = await requirePermission("refund:request");
  const chargeId = Number(formData.get("chargeId"));
  const reasonCode = String(formData.get("reasonCode"));

  const charge = db.select().from(charges).where(eq(charges.id, chargeId)).get();
  if (!charge || charge.status !== "open") {
    throw new Error("This charge is not open to refund.");
  }
  if (!REASON_CODES.includes(reasonCode as ReasonCode)) {
    throw new Error("Pick a reason code for the refund.");
  }

  const key = makeIdempotencyKey([chargeId, charge.amountCents, reasonCode, actor.name]);
  const limit =
    actor.role === "finance_manager" ? FINANCE_LIMIT_CENTS : AGENT_LIMIT_CENTS;
  const status = charge.amountCents <= limit ? "paid" : "pending_approval";

  // Idempotency: a retry with the same key returns the existing refund.
  const existing = db
    .select()
    .from(refunds)
    .where(eq(refunds.idempotencyKey, key))
    .get();
  if (existing) {
    redirect(`/refunds/${chargeId}?notice=duplicate`);
  }

  db.transaction((tx) => {
    const inserted = tx
      .insert(refunds)
      .values({
        chargeId,
        amountCents: charge.amountCents,
        reasonCode,
        status,
        requestedBy: actor.name,
        decidedBy: status === "paid" ? actor.name : null,
        idempotencyKey: key,
        createdAt: new Date().toISOString(),
      })
      .run();
    if (status === "paid") {
      tx.update(charges)
        .set({ status: "refunded" })
        .where(eq(charges.id, chargeId))
        .run();
    }
    audit.record(tx, {
      actor: actor.name,
      action: status === "paid" ? "refund.paid" : "refund.requested",
      entityType: "refund",
      entityId: String(inserted.lastInsertRowid),
      detail: `$${(charge.amountCents / 100).toFixed(2)} on ${charge.ref} (${reasonCode})`,
    });
  });
  revalidatePath("/refunds");
  redirect(`/refunds/${chargeId}?notice=${status === "paid" ? "paid" : "pending"}`);
}

export async function decideRefund(formData: FormData) {
  const actor = await requirePermission("refund:approve");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision"));

  db.transaction((tx) => {
    const row = tx.select().from(refunds).where(eq(refunds.id, id)).get();
    if (!row || row.status !== "pending_approval") {
      throw new Error("This refund is not waiting for approval.");
    }
    assertNotSelfApproval(row.requestedBy, actor);
    const approved = decision === "approve";
    tx.update(refunds)
      .set({ status: approved ? "approved" : "rejected", decidedBy: actor.name })
      .where(eq(refunds.id, id))
      .run();
    if (approved) {
      tx.update(charges)
        .set({ status: "refunded" })
        .where(eq(charges.id, row.chargeId))
        .run();
    }
    audit.record(tx, {
      actor: actor.name,
      action: `refund.${approved ? "approved" : "rejected"}`,
      entityType: "refund",
      entityId: String(id),
      detail: `$${(row.amountCents / 100).toFixed(2)} requested by ${row.requestedBy}`,
    });
  });
  revalidatePath("/refunds");
}
