"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireRole, assertNotSelfApproval, Forbidden } from "@/lib/require";
import { revalidatePath } from "next/cache";

// Ops records a renew/cancel decision; it only takes effect once a finance
// manager who is not the requester signs off.
export async function requestDecision(formData: FormData) {
  const user = await requireRole("ops_manager", "engineer");
  const contractId = String(formData.get("contractId"));
  const decision = String(formData.get("decision"));
  const note = String(formData.get("note") ?? "").trim();
  if (decision !== "renew" && decision !== "cancel")
    throw new Forbidden("Pick renew or cancel.");
  if (!note) throw new Forbidden("Add a short reason for the decision.");

  const contract = db
    .select()
    .from(schema.vendorContracts)
    .where(eq(schema.vendorContracts.id, contractId))
    .get();
  if (!contract || contract.status !== "active")
    throw new Forbidden("This contract already has a decision in progress.");

  db.transaction((tx) => {
    tx.update(schema.vendorContracts)
      .set({ status: "decision_pending", decision, decisionNote: note, requestedBy: user.id, signedOffBy: null })
      .where(eq(schema.vendorContracts.id, contractId))
      .run();
    audit.record(tx, {
      actor: user.id,
      action: "vendor_contract.decision_requested",
      entityType: "vendor_contract",
      entityId: contractId,
      detail: `${decision}: ${note}`,
    });
  });
  revalidatePath("/vendor-contracts");
}

export async function approveDecision(formData: FormData) {
  const user = await requireRole("finance_manager", "engineer");
  const contractId = String(formData.get("contractId"));
  const signoff = String(formData.get("signoff"));
  const contract = db
    .select()
    .from(schema.vendorContracts)
    .where(eq(schema.vendorContracts.id, contractId))
    .get();
  if (!contract || contract.status !== "decision_pending" || !contract.requestedBy)
    throw new Forbidden("This contract has no decision waiting for sign-off.");

  assertNotSelfApproval(user.id, contract.requestedBy);

  const approved = signoff === "approve";
  db.transaction((tx) => {
    tx.update(schema.vendorContracts)
      .set(
        approved
          ? { status: contract.decision === "renew" ? "renewed" : "cancelled", signedOffBy: user.id }
          : { status: "active", decision: null, decisionNote: null, requestedBy: null, signedOffBy: null }
      )
      .where(eq(schema.vendorContracts.id, contractId))
      .run();
    audit.record(tx, {
      actor: user.id,
      action: approved ? "vendor_contract.decision_approved" : "vendor_contract.decision_rejected",
      entityType: "vendor_contract",
      entityId: contractId,
      detail: `${contract.decision} requested by ${contract.requestedBy}`,
    });
  });
  revalidatePath("/vendor-contracts");
}
