import Link from "next/link";
import { desc, like, or } from "drizzle-orm";
import { db } from "../../platform/db";
import { charges, refunds } from "../../platform/db/schema";
import { seedIfEmpty } from "../../platform/db/seed";
import { currentPersona } from "../../platform/personas";
import { maskEmail } from "../../platform/mask";
import { decideRefund } from "../../platform/actions/refunds";


const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; notice?: string }>;
}) {
  seedIfEmpty();
  const { q } = await searchParams;
  const persona = await currentPersona();

  const rows = q
    ? db
        .select()
        .from(charges)
        .where(or(like(charges.ref, `%${q}%`), like(charges.customerRef, `%${q}%`)))
        .all()
    : db.select().from(charges).orderBy(desc(charges.id)).all();

  const pending = db
    .select()
    .from(refunds)
    .orderBy(desc(refunds.id))
    .all()
    .filter((r) => r.status === "pending_approval");

  const canApprove = persona?.permissions.includes("refund:approve");
  const canRefund = persona?.permissions.includes("refund:request");

  return (
    <>
      <h1>Refunds</h1>
      <p className="subtitle">
        Find a charge and refund it. Support refunds up to $100, finance up to
        $5,000 — anything larger needs a second approver.
      </p>

      {pending.length > 0 ? (
        <div className="card">
          <h3>Waiting for approval</h3>
          <table>
            <thead>
              <tr><th>Refund</th><th>Amount</th><th>Reason</th><th>Requested by</th><th></th></tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  <td className="mono">#{r.id}</td>
                  <td>{fmt(r.amountCents)}</td>
                  <td className="mono">{r.reasonCode}</td>
                  <td>{r.requestedBy}</td>
                  <td>
                    {canApprove ? (
                      <form action={decideRefund} className="inline">
                        <input type="hidden" name="id" value={r.id} />
                        <span className="btn-row">
                          <button name="decision" value="approve">Approve</button>
                          <button name="decision" value="reject" className="danger">Reject</button>
                        </span>
                      </form>
                    ) : (
                      <span className="mono">needs a finance manager</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="card">
        <form method="get" className="stack" style={{ maxWidth: 320 }}>
          <input name="q" defaultValue={q} placeholder="Search by charge or customer ref" />
          <button type="submit" className="secondary">Search</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Charge</th><th>Customer</th><th>Email</th><th>Amount</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.ref}</td>
                <td className="mono">{c.customerRef}</td>
                <td className="mono">{maskEmail(c.email)}</td>
                <td>{fmt(c.amountCents)}</td>
                <td><span className={`pill ${c.status}`}>{c.status}</span></td>
                <td>
                  {c.status === "open" && canRefund ? (
                    <Link href={`/refunds/${c.id}`}>Refund</Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
