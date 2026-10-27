import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/mask";
import { placeHold, requestRelease, approveRelease } from "./actions";

export const dynamic = "force-dynamic";

export default async function PayoutHoldsPage() {
  const user = await getCurrentUser();
  const canManage = user && ["ops_manager", "engineer"].includes(user.role);
  const canApprove = user && ["finance_manager", "engineer"].includes(user.role);
  const rows = db.select().from(schema.payoutHolds).all();
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));

  return (
    <>
      <h1>Payout holds</h1>
      <p className="subtitle">
        Track holds on merchant payouts: who placed the hold, why, and the amount
        held. Releases over $10,000 need a finance manager to approve — never the
        person who placed the hold.
      </p>

      {canManage && (
        <form action={placeHold} className="card" style={{ marginTop: 14 }}>
          <h3>Place a hold</h3>
          <div className="toolbar">
            <span><label>Merchant</label><input name="merchant" required /></span>
            <span><label>Amount held ($)</label><input name="amount" type="number" step="0.01" min="0" required /></span>
            <span><label>Reason</label><input name="reason" required style={{ width: 280 }} /></span>
            <button type="submit">Place hold</button>
          </div>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Hold</th><th>Merchant</th><th>Amount held</th><th>Reason</th>
            <th>Placed by</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.id}>
              <td className="mono">{h.id}</td>
              <td>{h.merchant}</td>
              <td>
                {money(h.amountCents)}
                {h.amountCents > 1_000_000 && <span className="pill warn" style={{ marginLeft: 6 }}>needs approval</span>}
              </td>
              <td>{h.reason}</td>
              <td>{names.get(h.placedBy)}</td>
              <td>
                <span className={`pill ${h.status === "released" ? "ok" : h.status === "release_pending" ? "warn" : "bad"}`}>
                  {h.status.replace("_", " ")}
                </span>
                {h.releasedBy && <span className="muted"> by {names.get(h.releasedBy)}</span>}
              </td>
              <td>
                {canManage && h.status === "held" && (
                  <form action={requestRelease} className="inline">
                    <input type="hidden" name="holdId" value={h.id} />
                    <button type="submit" className="small">Release</button>
                  </form>
                )}
                {canApprove && h.status === "release_pending" && (
                  <>
                    <form action={approveRelease} className="inline" style={{ marginRight: 6 }}>
                      <input type="hidden" name="holdId" value={h.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button type="submit" className="small">Approve release</button>
                    </form>
                    <form action={approveRelease} className="inline">
                      <input type="hidden" name="holdId" value={h.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button type="submit" className="small secondary">Reject</button>
                    </form>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
