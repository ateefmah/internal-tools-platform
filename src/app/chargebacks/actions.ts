"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission, assertNotSelfApproval, Forbidden } from "@/lib/require";
import { revalidatePath } from "next/cache";

export async function createChargeback(formData: FormData) {
  const user = await requirePermission("chargeback.manage");
  const merchant = String(formData.get("merchant") ?? "").trim();
  const amount = Math.round(Number(formData.get("amount") ?? 0) * 100);
  const reasonCode = String(formData.get("reasonCode") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();
  if (!merchant || !amount || !reasonCode || !deadline)
    throw new Forbidden("Fill in merchant, amount, reason code and deadline.");

  const id = `cb-${Date.now()}`;
  db.transaction((tx) => {
    tx.insert(schema.chargebacks)
      .values({
        id,
        merchant,
        amountCents: amount,
        networkReasonCode: reasonCode,
        deadline,
        status: "open",
        createdBy: user.id,
        signedOffBy: null,
        createdAt: new Date().toISOString(),
      })
      .run();
    audit.record(tx, {
      actor: user.id,
      action: "chargeback.logged",
      entityType: "chargeback",
      entityId: id,
      detail: `${merchant} ${reasonCode}`,
    });
  });
  revalidatePath("/chargebacks");
}

export async function addNote(formData: FormData) {
  const user = await requirePermission("chargeback.manage");
  const cbId = String(formData.get("cbId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Forbidden("Write the evidence note first.");

  db.transaction((tx) => {
    tx.insert(schema.chargebackNotes)
      .values({ chargebackId: cbId, author: user.id, body, createdAt: new Date().toISOString() })
      .run();
    audit.record(tx, {
      actor: user.id,
      action: "chargeback.note_added",
      entityType: "chargeback",
      entityId: cbId,
    });
  });
  revalidatePath(`/chargebacks/${cbId}`);
}

export async function submitForSignoff(formData: FormData) {
  const user = await requirePermission("chargeback.manage");
  const cbId = String(formData.get("cbId"));
  const cb = db.select().from(schema.chargebacks).where(eq(schema.chargebacks.id, cbId)).get();
  if (!cb || cb.status !== "open") throw new Forbidden("Only open disputes can be submitted.");

  db.transaction((tx) => {
    tx.update(schema.chargebacks)
      .set({ status: "pending_signoff" })
      .where(eq(schema.chargebacks.id, cbId))
      .run();
    audit.record(tx, {
      actor: user.id,
      action: "chargeback.submitted",
      entityType: "chargeback",
      entityId: cbId,
      detail: "sent to finance for sign-off",
    });
  });
  revalidatePath(`/chargebacks/${cbId}`);
}

export async function resolveSignoff(formData: FormData) {
  const user = await requirePermission("chargeback.signoff");
  const cbId = String(formData.get("cbId"));
  const decision = String(formData.get("decision"));
  const cb = db.select().from(schema.chargebacks).where(eq(schema.chargebacks.id, cbId)).get();
  if (!cb || cb.status !== "pending_signoff")
    throw new Forbidden("This dispute is not waiting for sign-off.");

  assertNotSelfApproval(user.id, cb.createdBy);

  db.transaction((tx) => {
    tx.update(schema.chargebacks)
      .set({ status: decision === "approve" ? "responded" : "open", signedOffBy: user.id })
      .where(eq(schema.chargebacks.id, cbId))
      .run();
    audit.record(tx, {
      actor: user.id,
      action: decision === "approve" ? "chargeback.signoff" : "chargeback.signoff_rejected",
      entityType: "chargeback",
      entityId: cbId,
    });
  });
  revalidatePath(`/chargebacks/${cbId}`);
}
