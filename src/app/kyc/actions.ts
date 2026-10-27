"use server";

import { eq, and, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission, assertNotSelfApproval, Forbidden } from "@/lib/require";
import { revalidatePath } from "next/cache";

function getCase(id: string) {
  return db.select().from(schema.kycCases).where(eq(schema.kycCases.id, id)).get();
}

export async function claimCase(formData: FormData) {
  const user = await requirePermission("kyc.review");
  const caseId = String(formData.get("caseId"));

  // Conditional update: only succeeds if the case is still unclaimed.
  // Two analysts clicking at once cannot both claim.
  const res = db.transaction((tx) => {
    const r = tx
      .update(schema.kycCases)
      .set({ claimedBy: user.id, status: "claimed" })
      .where(
        and(
          eq(schema.kycCases.id, caseId),
          eq(schema.kycCases.status, "open"),
          isNull(schema.kycCases.claimedBy)
        )
      )
      .run();
    if (r.changes === 0) return false;
    audit.record(tx, {
      actor: user.id,
      action: "kyc.claimed",
      entityType: "kyc_case",
      entityId: caseId,
    });
    return true;
  });
  if (!res) throw new Forbidden("That case was just claimed by someone else.");
  revalidatePath("/kyc");
}

export async function decideCase(formData: FormData) {
  const user = await requirePermission("kyc.review");
  const caseId = String(formData.get("caseId"));
  const decision = String(formData.get("decision"));
  const kc = getCase(caseId);
  if (!kc) throw new Forbidden("Case not found.");
  if (kc.claimedBy !== user.id)
    throw new Forbidden("Only the analyst who claimed this case can act on it.");

  if (decision === "request_info") {
    db.transaction((tx) => {
      tx.update(schema.kycCases)
        .set({ status: "info_requested" })
        .where(eq(schema.kycCases.id, caseId))
        .run();
      audit.record(tx, {
        actor: user.id,
        action: "kyc.info_requested",
        entityType: "kyc_case",
        entityId: caseId,
      });
    });
    revalidatePath(`/kyc/${caseId}`);
    return;
  }

  if (!["approve", "reject"].includes(decision)) throw new Forbidden("Bad decision.");

  // High-risk cases can't be decided by an analyst — they must escalate.
  if (kc.riskLevel === "high" && kc.status !== "escalated") {
    throw new Forbidden(
      "High-risk cases must be escalated to a senior reviewer first."
    );
  }
  if (kc.status === "escalated") {
    throw new Forbidden("This case is escalated — a senior reviewer decides.");
  }

  db.transaction((tx) => {
    tx.update(schema.kycCases)
      .set({ status: decision === "approve" ? "approved" : "rejected", decidedBy: user.id })
      .where(eq(schema.kycCases.id, caseId))
      .run();
    audit.record(tx, {
      actor: user.id,
      action: `kyc.${decision}d`,
      entityType: "kyc_case",
      entityId: caseId,
    });
  });
  revalidatePath(`/kyc/${caseId}`);
}

export async function escalateCase(formData: FormData) {
  const user = await requirePermission("kyc.review");
  const caseId = String(formData.get("caseId"));
  const kc = getCase(caseId);
  if (!kc) throw new Forbidden("Case not found.");
  if (kc.riskLevel !== "high")
    throw new Forbidden("Only high-risk cases need escalation.");

  db.transaction((tx) => {
    tx.update(schema.kycCases)
      .set({ status: "escalated", escalatedBy: user.id, claimedBy: user.id })
      .where(eq(schema.kycCases.id, caseId))
      .run();
    audit.record(tx, {
      actor: user.id,
      action: "kyc.escalated",
      entityType: "kyc_case",
      entityId: caseId,
      detail: "high-risk case sent to senior review",
    });
  });
  revalidatePath(`/kyc/${caseId}`);
}

export async function seniorDecide(formData: FormData) {
  const user = await requirePermission("kyc.senior_review");
  const caseId = String(formData.get("caseId"));
  const decision = String(formData.get("decision"));
  const kc = getCase(caseId);
  if (!kc || kc.status !== "escalated")
    throw new Forbidden("This case is not waiting on senior review.");
  if (!["approve", "reject"].includes(decision)) throw new Forbidden("Bad decision.");

  // Maker-checker: the senior who decides cannot be the analyst who escalated.
  assertNotSelfApproval(user.id, kc.escalatedBy ?? "");

  db.transaction((tx) => {
    tx.update(schema.kycCases)
      .set({ status: decision === "approve" ? "approved" : "rejected", decidedBy: user.id })
      .where(eq(schema.kycCases.id, caseId))
      .run();
    audit.record(tx, {
      actor: user.id,
      action: `kyc.senior_${decision}d`,
      entityType: "kyc_case",
      entityId: caseId,
      detail: `senior decision on escalation by ${kc.escalatedBy}`,
    });
  });
  revalidatePath(`/kyc/${caseId}`);
}
