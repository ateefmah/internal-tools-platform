"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission, assertNotSelfApproval, Forbidden } from "@/lib/require";
import { revalidatePath } from "next/cache";

const RELEASE_APPROVAL_CENTS = 1_000_000; // $10,000

export async function placeHold(formData: FormData) {
  const user = await requirePermission("payout.manage");
  const merchant = String(formData.get("merchant") ?? "").trim();
  const amount = Math.round(Number(formData.get("amount") ?? 0) * 100);
  const reason = String(formData.get("reason") ?? "").trim();
  if (!merchant || !amount || !reason)
    throw new Forbidden("Fill in merchant, amount and reason.");

  const id = `ph-${Date.now()}`;
  db.transaction((tx) => {
    tx.insert(schema.payoutHolds)
      .values({
        id,
        merchant,
        amountCents: amount,
        reason,
        placedBy: user.id,
        status: "held",
        releasedBy: null,
        createdAt: new Date().toISOString(),
      })
      .run();
    audit.record(tx, {
      actor: user.id,
      action: "payout_hold.placed",
      entityType: "payout_hold",
      entityId: id,
      detail: `${merchant} ${reason}`,
    });
  });
  revalidatePath("/payout-holds");
}

export async function requestRelease(formData: FormData) {
  const user = await requirePermission("payout.manage");
  const holdId = String(formData.get("holdId"));
  const hold = db.select().from(schema.payoutHolds).where(eq(schema.payoutHolds.id, holdId)).get();
  if (!hold || hold.status !== "held") throw new Forbidden("This hold is not active.");

  const needsApproval = hold.amountCents > RELEASE_APPROVAL_CENTS;
  db.transaction((tx) => {
    tx.update(schema.payoutHolds)
      .set({ status: needsApproval ? "release_pending" : "released", releasedBy: needsApproval ? null : user.id })
      .where(eq(schema.payoutHolds.id, holdId))
      .run();
    audit.record(tx, {
      actor: user.id,
      action: needsApproval ? "payout_hold.release_requested" : "payout_hold.released",
      entityType: "payout_hold",
      entityId: holdId,
      detail: needsApproval ? "over $10K — needs finance approval" : "",
    });
  });
  revalidatePath("/payout-holds");
}

export async function approveRelease(formData: FormData) {
  const user = await requirePermission("payout.release.approve");
  const holdId = String(formData.get("holdId"));
  const decision = String(formData.get("decision"));
  const hold = db.select().from(schema.payoutHolds).where(eq(schema.payoutHolds.id, holdId)).get();
  if (!hold || hold.status !== "release_pending")
    throw new Forbidden("This release is not waiting for approval.");

  assertNotSelfApproval(user.id, hold.placedBy);

  db.transaction((tx) => {
    tx.update(schema.payoutHolds)
      .set({
        status: decision === "approve" ? "released" : "held",
        releasedBy: decision === "approve" ? user.id : null,
      })
      .where(eq(schema.payoutHolds.id, holdId))
      .run();
    audit.record(tx, {
      actor: user.id,
      action: decision === "approve" ? "payout_hold.release_approved" : "payout_hold.release_rejected",
      entityType: "payout_hold",
      entityId: holdId,
      detail: `decision on hold placed by ${hold.placedBy}`,
    });
  });
  revalidatePath("/payout-holds");
}
