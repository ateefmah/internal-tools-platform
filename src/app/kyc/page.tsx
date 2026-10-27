import Link from "next/link";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { maskTaxId } from "@/lib/mask";
import { claimCase } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, string> = {
  open: "info",
  claimed: "info",
  info_requested: "warn",
  escalated: "warn",
  approved: "ok",
  rejected: "bad",
};

export default async function KycPage() {
  const user = await getCurrentUser();
  const canReview = user && ["kyc_analyst", "kyc_senior", "engineer"].includes(user.role);
  const cases = db.select().from(schema.kycCases).all();
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));

  return (
    <>
      <h1>KYC review queue</h1>
      <p className="subtitle">
        Analysts claim cases, then approve, reject or request more information.
        High-risk cases are escalated and decided by a senior reviewer — never
        the person who escalated. ID numbers are masked.
      </p>
      <table>
        <thead>
          <tr>
            <th>Case</th><th>Customer</th><th>Tax ID</th><th>Country</th>
            <th>Risk</th><th>Status</th><th>Claimed by</th><th></th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id}>
              <td className="mono">
                <Link href={`/kyc/${c.id}`}>{c.id}</Link>
              </td>
              <td>{c.customerName}</td>
              <td className="mono">{maskTaxId(c.taxId)}</td>
              <td>{c.country}</td>
              <td>
                <span className={`pill ${c.riskLevel === "high" ? "bad" : c.riskLevel === "medium" ? "warn" : "ok"}`}>
                  {c.riskLevel}
                </span>
              </td>
              <td><span className={`pill ${STATUS_PILL[c.status]}`}>{c.status}</span></td>
              <td>{c.claimedBy ? names.get(c.claimedBy) : "—"}</td>
              <td>
                {canReview && c.status === "open" && (
                  <form action={claimCase} className="inline">
                    <input type="hidden" name="caseId" value={c.id} />
                    <button type="submit" className="small">Claim</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
