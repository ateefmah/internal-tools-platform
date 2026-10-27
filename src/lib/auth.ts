import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

export type User = typeof schema.users.$inferSelect;

// Role -> permission map. Server-side writes check these via requirePermission.
export const PERMISSIONS: Record<string, string[]> = {
  support_agent: ["refund.create"],
  finance_manager: [
    "refund.create",
    "refund.create.large",
    "refund.approve",
    "chargeback.signoff",
    "payout.release.approve",
  ],
  kyc_analyst: ["kyc.review", "pii.reveal"],
  kyc_senior: ["kyc.review", "kyc.senior_review", "pii.reveal"],
  ops_manager: ["tools.request", "chargeback.manage", "payout.manage"],
  engineer: [
    "refund.create",
    "refund.create.large",
    "refund.approve",
    "chargeback.manage",
    "chargeback.signoff",
    "payout.manage",
    "payout.release.approve",
    "kyc.review",
    "kyc.senior_review",
    "pii.reveal",
    "tools.request",
    "tools.triage",
  ],
};

export const ROLE_LABELS: Record<string, string> = {
  support_agent: "Support agent",
  finance_manager: "Finance manager",
  kyc_analyst: "KYC analyst",
  kyc_senior: "KYC senior",
  ops_manager: "Ops manager",
  engineer: "Engineer",
};

const COOKIE = "persona_uid";

// Returns the signed-in user, or null when nobody is signed in.
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const uid = store.get(COOKIE)?.value;
  if (!uid) return null;
  return db.select().from(schema.users).where(eq(schema.users.id, uid)).get() ?? null;
}

export { COOKIE as PERSONA_COOKIE };
