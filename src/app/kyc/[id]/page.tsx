import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "../../../lib/db";
import { kycCases } from "../../../lib/db/schema";
import { seedIfEmpty } from "../../../lib/db/seed";
import { currentPersona } from "../../../lib/personas";
import { maskEmail, maskTaxId } from "../../../lib/mask";
import { revealPII } from "../../../lib/reveal";
import { submitKycDecision, submitSecondReview } from "../../../lib/actions/kyc";

export default async function KycDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reveal?: string }>;
}) {
  seedIfEmpty();
  const { id } = await params;
  const { reveal } = await searchParams;
  const persona = await currentPersona();
  const c = db.select().from(kycCases).where(eq(kycCases.id, Number(id))).get();
  if (!c) notFound();

  const canReveal = persona.permissions.includes("pii:reveal");
  const email = reveal === "email" ? await revealPII("kyc_case", id, "email", c.email) : maskEmail(c.email);
  const taxId = reveal === "taxId" ? await revealPII("kyc_case", id, "tax_id", c.taxId) : maskTaxId(c.taxId);

  const canDecide = persona.permissions.includes("kyc:decide") && c.status === "queued";
  const canSecond =
    persona.permissions.includes("kyc:approve") &&
    c.status === "awaiting_second_review" &&
    c.firstDecisionBy !== persona.name;

  return (
    <>
      <h1>
        Case {c.applicantRef} <span className={`pill ${c.risk}`}>{c.risk} risk</span>{" "}
        <span className={`pill ${c.status}`}>{c.status}</span>
      </h1>
      <p className="subtitle"><Link href="/kyc">← back to queue</Link></p>

      <div className="card">
        <table>
          <tbody>
            <tr>
              <th>Email</th>
              <td className="mono">
                {email}{" "}
                {reveal !== "email" && canReveal ? <Link href={`/kyc/${id}?reveal=email`}>reveal</Link> : null}
              </td>
            </tr>
            <tr>
              <th>Tax ID</th>
              <td className="mono">
                {taxId}{" "}
                {reveal !== "taxId" && canReveal ? <Link href={`/kyc/${id}?reveal=taxId`}>reveal</Link> : null}
              </td>
            </tr>
            <tr><th>First review by</th><td>{c.firstDecisionBy ?? "—"}</td></tr>
            <tr><th>Decision note</th><td>{c.decisionNote ?? "—"}</td></tr>
            <tr><th>Decided by</th><td>{c.decidedBy ?? "—"}</td></tr>
          </tbody>
        </table>
      </div>

      {c.status === "awaiting_second_review" && c.firstDecisionBy === persona.name ? (
        <div className="notice">
          You made the first call on this case. A different KYC senior must make
          the second — the platform will reject your approval.
        </div>
      ) : null}

      {canDecide ? (
        <div className="card">
          <h3>First review ({persona.role})</h3>
          <form action={submitKycDecision} className="stack">
            <input type="hidden" name="id" value={c.id} />
            <input name="note" placeholder="Decision note (optional)" />
            <span className="btn-row">
              <button name="decision" value="approve">Approve</button>
              <button name="decision" value="reject" className="danger">Reject</button>
            </span>
          </form>
        </div>
      ) : null}

      {canSecond ? (
        <div className="card">
          <h3>Second review (KYC senior)</h3>
          <p className="subtitle">First review by {c.firstDecisionBy}: {c.decisionNote}</p>
          <form action={submitSecondReview} className="stack">
            <input type="hidden" name="id" value={c.id} />
            <input name="note" placeholder="Decision note (optional)" />
            <span className="btn-row">
              <button name="decision" value="approve">Approve</button>
              <button name="decision" value="reject" className="danger">Reject</button>
            </span>
          </form>
        </div>
      ) : null}
    </>
  );
}

export const dynamic = "force-dynamic";
