import { desc } from "drizzle-orm";
import { db } from "../../lib/db";
import { refunds } from "../../lib/db/schema";
import { seedIfEmpty } from "../../lib/db/seed";
import { currentPersona } from "../../lib/personas";
import { submitRefund, approveRefund } from "../../lib/actions/refunds";

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function RefundsPage() {
  seedIfEmpty();
  const persona = await currentPersona();
  const rows = db.select().from(refunds).orderBy(desc(refunds.id)).all();
  const canRequest = persona.permissions.includes("refund:request");
  const canApprove = persona.permissions.includes("refund:approve");

  return (
    <>
      <h1>Refunds</h1>
      <p className="subtitle">
        Support agents issue up to $100, finance managers up to $5,000. Anything
        above needs approval by a different finance manager.
      </p>

      {canRequest ? (
        <div className="card">
          <h3>New refund</h3>
          <form action={submitRefund} className="stack">
            <input name="customerRef" placeholder="Customer ref (e.g. cus_1234)" required />
            <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (USD)" required />
            <input name="reason" placeholder="Reason" required />
            <button type="submit">Submit</button>
          </form>
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr><th>ID</th><th>Customer</th><th>Amount</th><th>Reason</th><th>Status</th><th>Requested by</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">#{r.id}</td>
                <td className="mono">{r.customerRef}</td>
                <td>{fmt(r.amountCents)}</td>
                <td>{r.reason}</td>
                <td><span className={`pill ${r.status}`}>{r.status}</span></td>
                <td>{r.requestedBy}</td>
                <td>
                  {r.status === "pending_approval" && canApprove && r.requestedBy !== persona.name ? (
                    <form action={approveRefund} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <span className="btn-row">
                        <button name="decision" value="approve">Approve</button>
                        <button name="decision" value="reject" className="danger">Reject</button>
                      </span>
                    </form>
                  ) : r.status === "pending_approval" ? (
                    <span className="mono">needs finance approval</span>
                  ) : (
                    <span className="mono">{r.decidedBy ?? ""}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
