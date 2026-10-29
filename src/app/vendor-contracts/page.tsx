import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { maskEmail, money } from "@/lib/mask";
import { requestDecision, approveDecision } from "./actions";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;
const DAY_MS = 86400_000;

function daysUntil(date: string, today: Date): number {
  return Math.round((Date.parse(date) - Date.parse(today.toISOString().slice(0, 10))) / DAY_MS);
}

const STATUS_PILL: Record<string, string> = {
  active: "info",
  decision_pending: "warn",
  renewed: "ok",
  cancelled: "bad",
};

export default async function VendorContractsPage() {
  const user = await getCurrentUser();
  const canDecide = user && ["ops_manager", "engineer"].includes(user.role);
  const canSignOff = user && ["finance_manager", "engineer"].includes(user.role);
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));
  const today = new Date();

  const all = db
    .select()
    .from(schema.vendorContracts)
    .all()
    .map((c) => {
      const daysLeft = daysUntil(c.renewalDate, today);
      return { ...c, daysLeft, noticeLeft: daysLeft - c.noticeDays };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const isOpen = (c: (typeof all)[number]) => c.status === "active" || c.status === "decision_pending";
  // Past renewal dates stay listed only while the contract still has no final decision.
  const due = all.filter((c) => c.daysLeft <= WINDOW_DAYS && (c.daysLeft >= 0 || isOpen(c)));
  const later = all.filter((c) => c.daysLeft > WINDOW_DAYS).length;
  const undecided = due.filter((c) => c.status === "active");
  // The cancel-notice deadline only matters until a renewal decision is made.
  const noticeRelevant = (c: (typeof all)[number]) =>
    c.status === "active" || (c.status === "decision_pending" && c.decision === "cancel");
  const noticeMissed = due.filter((c) => c.autoRenew && c.noticeLeft < 0 && noticeRelevant(c));

  return (
    <>
      <h1>Vendor contract renewals</h1>
      <p className="subtitle">
        Contracts renewing in the next {WINDOW_DAYS} days, soonest first. Ops records a
        renew or cancel decision; it only takes effect once a finance manager signs off —
        never the person who made the decision.
      </p>

      <div className={`notice${noticeMissed.length ? " err" : ""}`}>
        <strong>{due.length}</strong> contracts renew within {WINDOW_DAYS} days ·{" "}
        <strong>{undecided.length}</strong> still need a decision
        {noticeMissed.length > 0 && (
          <>
            {" "}· <strong>{noticeMissed.length}</strong> auto-renew past the cancellation
            notice deadline ({noticeMissed.map((c) => c.vendor).join(", ")})
          </>
        )}
        . <span className="muted">{later} more renew later.</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Contract</th><th>Vendor</th><th>Annual value</th><th>Renews</th>
            <th>Cancel notice</th><th>Owner / contact</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {due.map((c) => (
            <tr key={c.id}>
              <td className="mono">{c.id}</td>
              <td>
                {c.vendor}
                <div className="muted">{c.service}</div>
              </td>
              <td>{money(c.annualValueCents)}</td>
              <td>
                {c.renewalDate}
                <div className={c.daysLeft <= 7 ? "due-soon" : "muted"}>
                  {c.daysLeft < 0 ? `${-c.daysLeft} days ago` : `in ${c.daysLeft} days`}
                </div>
              </td>
              <td>
                {c.noticeDays} days{" "}
                {c.autoRenew ? <span className="pill">auto-renews</span> : <span className="pill">manual</span>}
                {noticeRelevant(c) && (
                  <div className={c.noticeLeft < 0 ? "due-soon" : c.noticeLeft <= 7 ? "due-soon" : "muted"}>
                    {c.noticeLeft < 0 ? "notice deadline passed" : `notice due in ${c.noticeLeft} days`}
                  </div>
                )}
              </td>
              <td>
                {names.get(c.ownerId)}
                <div className="mono muted">{maskEmail(c.contactEmail)}</div>
              </td>
              <td>
                <span className={`pill ${STATUS_PILL[c.status] ?? ""}`}>{c.status.replace("_", " ")}</span>
                {c.decision && (
                  <div className="muted">
                    {c.decision} — {c.decisionNote}
                    <br />
                    by {names.get(c.requestedBy ?? "")}
                    {c.signedOffBy && `, signed off by ${names.get(c.signedOffBy)}`}
                  </div>
                )}
              </td>
              <td>
                {canDecide && c.status === "active" && (
                  <form action={requestDecision}>
                    <input type="hidden" name="contractId" value={c.id} />
                    <select name="decision" defaultValue="renew">
                      <option value="renew">Renew</option>
                      <option value="cancel">Cancel</option>
                    </select>{" "}
                    <input name="note" placeholder="Reason" required style={{ width: 120 }} />{" "}
                    <button type="submit" className="small">Request sign-off</button>
                  </form>
                )}
                {canSignOff && c.status === "decision_pending" && (
                  <>
                    <form action={approveDecision} className="inline" style={{ marginRight: 6 }}>
                      <input type="hidden" name="contractId" value={c.id} />
                      <input type="hidden" name="signoff" value="approve" />
                      <button type="submit" className="small">Sign off</button>
                    </form>
                    <form action={approveDecision} className="inline">
                      <input type="hidden" name="contractId" value={c.id} />
                      <input type="hidden" name="signoff" value="reject" />
                      <button type="submit" className="small secondary">Send back</button>
                    </form>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        Vendor contact emails are masked. In-app alerts only — no email or Slack notifications.
      </p>
    </>
  );
}
