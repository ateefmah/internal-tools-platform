"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { refunds } from "../db/schema";
import { audit } from "../audit";
import { requirePermission, assertNotSelfApproval } from "../require";

const AGENT_LIMIT_CENTS = 100_00; // support agent: up to $100
const FINANCE_LIMIT_CENTS = 5000_00; // finance manager: up to $5,000

export async function submitRefund(formData: FormData) {
  const actor = await requirePermission("refund:request");
  const amountCents = Math.round(Number(formData.get("amount")) * 100);
  const customerRef = String(formData.get("customerRef") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!customerRef || !reason || !Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("invalid refund request");
  }

  const limit =
    actor.role === "finance_manager" ? FINANCE_LIMIT_CENTS : AGENT_LIMIT_CENTS;
  const status = amountCents <= limit ? "paid" : "pending_approval";

  db.transaction((tx) => {
    const inserted = tx
      .insert(refunds)
      .values({
        customerRef,
        amountCents,
        reason,
        status,
        requestedBy: actor.name,
        decidedBy: status === "paid" ? actor.name : null,
        createdAt: new Date().toISOString(),
      })
      .run();
    audit.record(tx, {
      actor: actor.name,
      action: status === "paid" ? "refund.paid" : "refund.requested",
      entityType: "refund",
      entityId: String(inserted.lastInsertRowid),
      detail: `$${(amountCents / 100).toFixed(2)} for ${customerRef}`,
    });
  });
  revalidatePath("/refunds");
}

export async function approveRefund(formData: FormData) {
  const actor = await requirePermission("refund:approve");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision"));

  db.transaction((tx) => {
    const row = tx.select().from(refunds).where(eq(refunds.id, id)).get();
    if (!row || row.status !== "pending_approval") {
      throw new Error("refund is not awaiting approval");
    }
    assertNotSelfApproval(row.requestedBy, actor);
    tx.update(refunds)
      .set({ status: decision === "approve" ? "approved" : "rejected", decidedBy: actor.name })
      .where(eq(refunds.id, id))
      .run();
    audit.record(tx, {
      actor: actor.name,
      action: `refund.${decision === "approve" ? "approved" : "rejected"}`,
      entityType: "refund",
      entityId: String(id),
      detail: `$${(row.amountCents / 100).toFixed(2)} requested by ${row.requestedBy}`,
    });
  });
  revalidatePath("/refunds");
}
