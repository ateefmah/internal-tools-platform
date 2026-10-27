import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "../../lib/db";
import { kycCases } from "../../lib/db/schema";
import { seedIfEmpty } from "../../lib/db/seed";
import { maskEmail } from "../../lib/mask";

export default async function KycPage() {
  seedIfEmpty();
  const rows = db.select().from(kycCases).orderBy(desc(kycCases.id)).all();

  return (
    <>
      <h1>KYC Review Queue</h1>
      <p className="subtitle">
        Analysts make the first call. High-risk cases must get a second review
        from a different KYC senior before they close.
      </p>
      <div className="card">
        <table>
          <thead>
            <tr><th>Case</th><th>Applicant</th><th>Email</th><th>Risk</th><th>Status</th><th>First review</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="mono">#{c.id}</td>
                <td className="mono">{c.applicantRef}</td>
                <td className="mono">{maskEmail(c.email)}</td>
                <td><span className={`pill ${c.risk}`}>{c.risk}</span></td>
                <td><span className={`pill ${c.status}`}>{c.status}</span></td>
                <td>{c.firstDecisionBy ?? "—"}</td>
                <td><Link href={`/kyc/${c.id}`}>open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
