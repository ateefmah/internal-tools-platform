import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "../../../platform/db";
import { charges, refunds } from "../../../platform/db/schema";
import { seedIfEmpty } from "../../../platform/db/seed";
import { currentPersona } from "../../../platform/personas";
import { maskEmail } from "../../../platform/mask";
import { revealPII } from "../../../platform/reveal";
import { requestRefund } from "../../../platform/actions/refunds";
import { REASON_CODES } from "../../../platform/reasons";


const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const NOTICES: Record<string, string> = {
  paid: "Refund issued and logged in the audit trail.",
  pending: "Refund is waiting for approval by a different finance manager.",
  duplicate:
    "This exact request was already submitted — showing the existing refund instead of charging twice.",
};

export default async function ChargePage({
  params,
  searchParams,
}: {
  params: Promise<{ chargeId: string }>;
  searchParams: Promise<{ reveal?: string; notice?: string }>;
}) {
  seedIfEmpty();
  const { chargeId } = await params;
  const { reveal, notice } = await searchParams;
  const persona = await currentPersona();

  const c = db.select().from(charges).where(eq(charges.id, Number(chargeId))).get();
  if (!c) notFound();

  const canReveal = persona?.permissions.includes("pii:reveal") ?? false;
  const email =
    reveal === "email"
      ? await revealPII("charge", chargeId, "email", c.email)
      : maskEmail(c.email);

  const history = db
    .select()
    .from(refunds)
    .where(eq(refunds.chargeId, c.id))
    .orderBy(desc(refunds.id))
    .all();

  const canRefund = persona?.permissions.includes("refund:request") && c.status === "open";

  return (
    <>
      <h1>
        {c.ref} <span className={`pill ${c.status}`}>{c.status}</span>
      </h1>
      <p className="subtitle"><Link href="/refunds">← back to charges</Link></p>

      {notice && NOTICES[notice] ? <div className="notice">{NOTICES[notice]}</div> : null}
      {reveal === "email" ? (
        <div className="notice">Private data shown — this view was recorded in the audit log.</div>
      ) : null}

      <div className="card">
        <table>
          <tbody>
            <tr><th>Customer</th><td className="mono">{c.customerRef}</td></tr>
            <tr>
              <th>Email</th>
              <td className="mono">
                {email}{" "}
                {reveal !== "email" && canReveal ? (
                  <Link href={`/refunds/${chargeId}?reveal=email`}>reveal</Link>
                ) : null}
              </td>
            </tr>
            <tr><th>Amount</th><td>{fmt(c.amountCents)}</td></tr>
          </tbody>
        </table>
      </div>

      {canRefund ? (
        <div className="card">
          <h3>Refund {fmt(c.amountCents)}</h3>
          <p className="subtitle">
            {c.amountCents > (persona?.role === "finance_manager" ? 5000_00 : 100_00)
              ? "This is above your limit — it will go to a second approver instead of paying out."
              : "This will be issued immediately and logged."}
          </p>
          <form action={requestRefund} className="stack">
            <input type="hidden" name="chargeId" value={c.id} />
            <select name="reasonCode" required>
              <option value="">Pick a reason code…</option>
              {REASON_CODES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button type="submit">Submit refund</button>
          </form>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="card">
          <h3>Refund history</h3>
          <table>
            <thead>
              <tr><th>ID</th><th>Amount</th><th>Reason</th><th>Status</th><th>By</th><th>Key</th></tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id}>
                  <td className="mono">#{r.id}</td>
                  <td>{fmt(r.amountCents)}</td>
                  <td className="mono">{r.reasonCode}</td>
                  <td><span className={`pill ${r.status}`}>{r.status}</span></td>
                  <td>{r.requestedBy}</td>
                  <td className="mono" title={r.idempotencyKey}>{r.idempotencyKey.slice(0, 12)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
