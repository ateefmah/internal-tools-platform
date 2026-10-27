"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { toolRequests } from "../db/schema";
import { audit } from "../audit";
import { requirePermission, assertNotSelfApproval } from "../require";

// The "plain-English Slack request" intake: ops describes the tool in one
// sentence, engineering triages it, and it lands in src/apps/registry.ts
// when it ships.
export async function submitToolRequest(formData: FormData) {
  const actor = await requirePermission("tools:request");
  const text = String(formData.get("requestText") ?? "").trim();
  if (text.length < 10) {
    throw new Error("describe the tool you need in a sentence or two");
  }

  db.transaction((tx) => {
    const inserted = tx
      .insert(toolRequests)
      .values({
        requestText: text,
        requestedBy: actor.name,
        status: "new",
        createdAt: new Date().toISOString(),
      })
      .run();
    audit.record(tx, {
      actor: actor.name,
      action: "tool.requested",
      entityType: "tool_request",
      entityId: String(inserted.lastInsertRowid),
      detail: text.slice(0, 120),
    });
  });
  revalidatePath("/requests");
}

export async function triageToolRequest(formData: FormData) {
  const actor = await requirePermission("tools:triage");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")); // in_build | shipped | rejected

  db.transaction((tx) => {
    const row = tx.select().from(toolRequests).where(eq(toolRequests.id, id)).get();
    if (!row) throw new Error("tool request not found");
    if (status === "shipped") assertNotSelfApproval(row.requestedBy, actor);
    tx.update(toolRequests)
      .set({ status, triagedBy: actor.name })
      .where(eq(toolRequests.id, id))
      .run();
    audit.record(tx, {
      actor: actor.name,
      action: `tool.${status}`,
      entityType: "tool_request",
      entityId: String(id),
      detail: `requested by ${row.requestedBy}`,
    });
  });
  revalidatePath("/requests");
}
