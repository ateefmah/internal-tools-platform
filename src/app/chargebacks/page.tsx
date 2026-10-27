import Link from "next/link";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/mask";
import { createChargeback } from "./actions";

export const dynamic = "force-dynamic";

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400_000);
}

export default async function ChargebacksPage() {
  const user = await getCurrentUser();
  const canManage = user && ["ops_manager", "engineer"].includes(user.role);
  const rows = db.select().from(schema.chargebacks).all();
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));

  return (
    <>
      <h1>Chargebacks</h1>
      <p className="subtitle">
        Ops logs a dispute with the card-network reason code and response
        deadline, attaches evidence notes, and a finance lead signs off before
        the response goes out.
      </p>

      {canManage && (
        <form action={createChargeback} className="card" style={{ marginTop: 14 }}>
          <h3>Log a dispute</h3>
          <div className="toolbar">
            <span><label>Merchant</label><input name="merchant" required /></span>
            <span><label>Amount ($)</label><input name="amount" type="number" step="0.01" min="0" required /></span>
            <span><label>Network reason code</label><input name="reasonCode" placeholder="10.4 - Fraud" required /></span>
            <span><label>Response deadline</label><input name="deadline" type="date" required /></span>
            <button type="submit">Log dispute</button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Dispute</th><th>Merchant</th><th>Amount</th><th>Reason code</th>
            <th>Deadline</th><th>Status</th><th>By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const d = daysUntil(c.deadline);
            return (
              <tr key={c.id}>
                <td className="mono"><Link href={`/chargebacks/${c.id}`}>{c.id}</Link></td>
                <td>{c.merchant}</td>
                <td>{money(c.amountCents)}</td>
                <td>{c.networkReasonCode}</td>
                <td className={d <= 3 && c.status !== "responded" ? "due-soon" : ""}>
                  {c.deadline}{d <= 3 && c.status !== "responded" ? ` (${d}d left)` : ""}
                </td>
                <td>
                  <span className={`pill ${c.status === "responded" ? "ok" : c.status === "pending_signoff" ? "warn" : "info"}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </td>
                <td>{names.get(c.createdBy)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
