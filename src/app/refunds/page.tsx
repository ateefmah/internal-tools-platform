import { desc, like, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/mask";
import { requestRefund, approveRefund } from "./actions";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

const REASONS = [
  ["duplicate_charge", "Duplicate charge"],
  ["fraud_confirmed", "Fraud confirmed"],
  ["service_not_delivered", "Service not delivered"],
  ["customer_request", "Customer request"],
];

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await getCurrentUser();
  const canCreate = user && (user.role === "support_agent" || user.role === "finance_manager" || user.role === "engineer");
  const canApprove = user && (user.role === "finance_manager" || user.role === "engineer");

  const charges = q
    ? db.select().from(schema.charges).where(like(schema.charges.customerName, `%${q}%`)).all()
    : db.select().from(schema.charges).all();
  const pending = db
    .select()
    .from(schema.refunds)
    .where(eq(schema.refunds.status, "pending_approval"))
    .all();
  const history = db.select().from(schema.refunds).orderBy(desc(schema.refunds.createdAt)).all();
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));

  return (
    <>
      <h1>Refunds</h1>
      <p className="subtitle">
        Support refunds up to $100. Finance up to $5,000. Anything larger needs a
        second approver — never the requester. Every refund lands in the audit log.
      </p>

      {canApprove && pending.length > 0 && (
        <div className="section">
          <h2>Waiting for a second approver</h2>
          <table>
            <thead>
              <tr>
                <th>Refund</th><th>Charge</th><th>Amount</th><th>Requested by</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td className="mono">{r.chargeId}</td>
                  <td>{money(r.amountCents)}</td>
                  <td>{names.get(r.requestedBy)}</td>
                  <td>
                    <form action={approveRefund} className="inline" style={{ marginRight: 6 }}>
                      <input type="hidden" name="refundId" value={r.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button className="small" type="submit">Approve</button>
                    </form>
                    <form action={approveRefund} className="inline">
                      <input type="hidden" name="refundId" value={r.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button className="small danger" type="submit">Reject</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section">
        <h2>Charges</h2>
        <form method="get" className="toolbar">
          <input name="q" placeholder="Search customer" defaultValue={q ?? ""} />
          <button type="submit" className="secondary">Search</button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Charge</th><th>Customer</th><th>Amount</th><th>Status</th>
              {canCreate && <th>Refund</th>}
            </tr>
          </thead>
          <tbody>
            {charges.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.id}</td>
                <td>{c.customerName}</td>
                <td>{money(c.amountCents)}</td>
                <td><span className={`pill ${c.status === "refunded" ? "warn" : "ok"}`}>{c.status}</span></td>
                {canCreate && (
                  <td>
                    {c.status === "charged" ? (
                      <form action={requestRefund} className="inline">
                        <input type="hidden" name="chargeId" value={c.id} />
                        <input type="hidden" name="idem" value={randomUUID()} />
                        <select name="reasonCode" required defaultValue="">
                          <option value="" disabled>Reason…</option>
                          {REASONS.map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>{" "}
                        <button className="small" type="submit">Refund</button>
                      </form>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <h2>Refund history</h2>
        <table>
          <thead>
            <tr>
              <th>Refund</th><th>Charge</th><th>Amount</th><th>Reason</th><th>Status</th><th>Requested by</th><th>Decided by</th>
            </tr>
          </thead>
          <tbody>
            {history.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td className="mono">{r.chargeId}</td>
                <td>{money(r.amountCents)}</td>
                <td>{r.reasonCode}</td>
                <td>
                  <span className={`pill ${r.status === "completed" ? "ok" : r.status === "rejected" ? "bad" : "warn"}`}>
                    {r.status}
                  </span>
                </td>
                <td>{names.get(r.requestedBy)}</td>
                <td>{r.decidedBy ? names.get(r.decidedBy) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
