"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { kycCases } from "../db/schema";
import { audit } from "../audit";
import { requirePermission, assertNotSelfApproval } from "../require";

// First pass: analyst (or senior) approves/rejects. High-risk decisions move
// to awaiting_second_review instead of final.
export async function submitKycDecision(formData: FormData) {
  const actor = await requirePermission("kyc:decide");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision")); // approve | reject
  const note = String(formData.get("note") ?? "").trim();

  db.transaction((tx) => {
    const row = tx.select().from(kycCases).where(eq(kycCases.id, id)).get();
    if (!row || row.status !== "queued") {
      throw new Error("case is not queued for first review");
    }
    const next =
      row.risk === "high"
        ? "awaiting_second_review"
        : decision === "approve"
          ? "approved"
          : "rejected";
    tx.update(kycCases)
      .set({
        status: next,
        decisionNote: note,
        firstDecisionBy: actor.name,
        decidedBy: next === "awaiting_second_review" ? null : actor.name,
      })
      .where(eq(kycCases.id, id))
      .run();
    audit.record(tx, {
      actor: actor.name,
      action:
        next === "awaiting_second_review"
          ? `kyc.first_review_${decision}`
          : `kyc.${next === "approved" ? "approved" : "rejected"}`,
      entityType: "kyc_case",
      entityId: String(id),
      detail: `${decision} (${row.risk} risk)${note ? `: ${note}` : ""}`,
    });
  });
  revalidatePath("/kyc");
  redirect(`/kyc/${id}`);
}

// Maker-checker: a senior who is not the first reviewer gives the final call.
export async function submitSecondReview(formData: FormData) {
  const actor = await requirePermission("kyc:approve");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision"));
  const note = String(formData.get("note") ?? "").trim();

  db.transaction((tx) => {
    const row = tx.select().from(kycCases).where(eq(kycCases.id, id)).get();
    if (!row || row.status !== "awaiting_second_review") {
      throw new Error("case is not awaiting second review");
    }
    assertNotSelfApproval(row.firstDecisionBy ?? "", actor);
    tx.update(kycCases)
      .set({
        status: decision === "approve" ? "approved" : "rejected",
        decisionNote: note || row.decisionNote,
        decidedBy: actor.name,
      })
      .where(eq(kycCases.id, id))
      .run();
    audit.record(tx, {
      actor: actor.name,
      action: `kyc.second_review_${decision}`,
      entityType: "kyc_case",
      entityId: String(id),
      detail: `first review by ${row.firstDecisionBy}`,
    });
  });
  revalidatePath("/kyc");
  redirect(`/kyc/${id}`);
}
