import { desc } from "drizzle-orm";
import { db } from "../../lib/db";
import { chargebacks } from "../../lib/db/schema";
import { seedIfEmpty } from "../../lib/db/seed";
import { currentPersona } from "../../lib/personas";
import { contestChargeback, resolveChargeback } from "../../lib/actions/chargebacks";

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function ChargebacksPage() {
  seedIfEmpty();
  const persona = await currentPersona();
  const rows = db.select().from(chargebacks).orderBy(desc(chargebacks.id)).all();
  const canWork = ["support_agent", "finance_manager"].includes(persona.role);

  return (
    <>
      <h1>Chargebacks</h1>
      <p className="subtitle">
        Contest open chargebacks, then a different teammate resolves the outcome
        (maker-checker).
      </p>
      <div className="card">
        <table>
          <thead>
            <tr><th>ID</th><th>Transaction</th><th>Amount</th><th>Reason</th><th>Status</th><th>Contested by</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="mono">#{c.id}</td>
                <td className="mono">{c.txnRef}</td>
                <td>{fmt(c.amountCents)}</td>
                <td>{c.reasonCode}</td>
                <td><span className={`pill ${c.status}`}>{c.status}</span></td>
                <td>{c.contestedBy ?? "—"}</td>
                <td>
                  {c.status === "open" && canWork ? (
                    <form action={contestChargeback} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <button>Contest</button>
                    </form>
                  ) : null}
                  {c.status === "contested" && canWork && c.contestedBy !== persona.name ? (
                    <form action={resolveChargeback} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <span className="btn-row">
                        <button name="outcome" value="won">Won</button>
                        <button name="outcome" value="lost" className="danger">Lost</button>
                      </span>
                    </form>
                  ) : null}
                  {["won", "lost"].includes(c.status) ? (
                    <span className="mono">resolved by {c.resolvedBy}</span>
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

export const dynamic = "force-dynamic";
