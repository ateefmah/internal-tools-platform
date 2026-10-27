"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { chargebacks } from "../db/schema";
import { audit } from "../audit";
import { requireRole, assertNotSelfApproval } from "../require";

const WORKER_ROLES = ["support_agent", "finance_manager"];

export async function contestChargeback(formData: FormData) {
  const actor = await requireRole(WORKER_ROLES);
  const id = Number(formData.get("id"));

  db.transaction((tx) => {
    const row = tx.select().from(chargebacks).where(eq(chargebacks.id, id)).get();
    if (!row || row.status !== "open") {
      throw new Error("chargeback is not open");
    }
    tx.update(chargebacks)
      .set({ status: "contested", contestedBy: actor.name })
      .where(eq(chargebacks.id, id))
      .run();
    audit.record(tx, {
      actor: actor.name,
      action: "chargeback.contested",
      entityType: "chargeback",
      entityId: String(id),
      detail: `${row.txnRef} $${(row.amountCents / 100).toFixed(2)}`,
    });
  });
  revalidatePath("/chargebacks");
}

export async function resolveChargeback(formData: FormData) {
  const actor = await requireRole(WORKER_ROLES);
  const id = Number(formData.get("id"));
  const outcome = String(formData.get("outcome")); // won | lost

  db.transaction((tx) => {
    const row = tx.select().from(chargebacks).where(eq(chargebacks.id, id)).get();
    if (!row || row.status !== "contested") {
      throw new Error("chargeback is not contested");
    }
    assertNotSelfApproval(row.contestedBy ?? "", actor);
    tx.update(chargebacks)
      .set({ status: outcome === "won" ? "won" : "lost", resolvedBy: actor.name })
      .where(eq(chargebacks.id, id))
      .run();
    audit.record(tx, {
      actor: actor.name,
      action: `chargeback.${outcome === "won" ? "won" : "lost"}`,
      entityType: "chargeback",
      entityId: String(id),
      detail: `contested by ${row.contestedBy}`,
    });
  });
  revalidatePath("/chargebacks");
}
