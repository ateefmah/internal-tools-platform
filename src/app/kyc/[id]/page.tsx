import { eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { maskTaxId } from "@/lib/mask";
import { decideCase, escalateCase, seniorDecide } from "../actions";
import { RevealButton } from "@/components/RevealButton";

export const dynamic = "force-dynamic";

export default async function KycCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kc = db.select().from(schema.kycCases).where(eq(schema.kycCases.id, id)).get();
  const user = await getCurrentUser();
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));
  if (!kc) return <p>Case not found.</p>;

  const isClaimer = user && kc.claimedBy === user.id;
  const isSenior = user && ["kyc_senior", "engineer"].includes(user.role);
  const open = ["claimed", "info_requested", "escalated"].includes(kc.status);

  return (
    <>
      <p><Link href="/kyc">← Back to queue</Link></p>
      <h1>
        {kc.customerName} <span className="muted mono">({kc.id})</span>
      </h1>
      <table>
        <tbody>
          <tr><th>Status</th><td><span className="pill info">{kc.status}</span></td></tr>
          <tr><th>Risk level</th><td><span className={`pill ${kc.riskLevel === "high" ? "bad" : "ok"}`}>{kc.riskLevel}</span></td></tr>
          <tr><th>Country</th><td>{kc.country}</td></tr>
          <tr>
            <th>Tax ID</th>
            <td>
              <span className="mono">{maskTaxId(kc.taxId)}</span>{" "}
              <RevealButton entityType="kyc_case" entityId={kc.id} field="taxId" />
            </td>
          </tr>
          <tr><th>Claimed by</th><td>{kc.claimedBy ? names.get(kc.claimedBy) : "—"}</td></tr>
          {kc.escalatedBy && <tr><th>Escalated by</th><td>{names.get(kc.escalatedBy)}</td></tr>}
          {kc.decidedBy && <tr><th>Decided by</th><td>{names.get(kc.decidedBy)}</td></tr>}
        </tbody>
      </table>

      {kc.riskLevel === "high" && kc.status !== "escalated" && !["approved", "rejected"].includes(kc.status) && (
        <div className="notice">
          High-risk case: an analyst cannot decide it directly. Escalate it and a
          senior reviewer (who is not the escalator) decides.
        </div>
      )}
      {kc.status === "escalated" && (
        <div className="notice">
          Waiting for senior review. The analyst who escalated it cannot decide it.
        </div>
      )}

      {open && isClaimer && kc.status !== "escalated" && (
        <div className="toolbar">
          {kc.riskLevel !== "high" && (
            <>
              <form action={decideCase} className="inline">
                <input type="hidden" name="caseId" value={kc.id} />
                <input type="hidden" name="decision" value="approve" />
                <button type="submit">Approve</button>
              </form>
              <form action={decideCase} className="inline">
                <input type="hidden" name="caseId" value={kc.id} />
                <input type="hidden" name="decision" value="reject" />
                <button type="submit" className="danger">Reject</button>
              </form>
            </>
          )}
          {kc.riskLevel === "high" && (
            <form action={escalateCase} className="inline">
              <input type="hidden" name="caseId" value={kc.id} />
              <button type="submit">Escalate to senior review</button>
            </form>
          )}
          <form action={decideCase} className="inline">
            <input type="hidden" name="caseId" value={kc.id} />
            <input type="hidden" name="decision" value="request_info" />
            <button type="submit" className="secondary">Request more info</button>
          </form>
        </div>
      )}

      {isSenior && kc.status === "escalated" && (
        <div className="toolbar">
          <form action={seniorDecide} className="inline">
            <input type="hidden" name="caseId" value={kc.id} />
            <input type="hidden" name="decision" value="approve" />
            <button type="submit">Approve (senior)</button>
          </form>
          <form action={seniorDecide} className="inline">
            <input type="hidden" name="caseId" value={kc.id} />
            <input type="hidden" name="decision" value="reject" />
            <button type="submit" className="danger">Reject (senior)</button>
          </form>
        </div>
      )}
    </>
  );
}
