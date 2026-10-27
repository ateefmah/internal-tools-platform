import { eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { money } from "@/lib/mask";
import { addNote, submitForSignoff, resolveSignoff } from "../actions";

export const dynamic = "force-dynamic";

export default async function ChargebackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cb = db.select().from(schema.chargebacks).where(eq(schema.chargebacks.id, id)).get();
  const user = await getCurrentUser();
  if (!cb) return <p>Dispute not found.</p>;

  const notes = db
    .select()
    .from(schema.chargebackNotes)
    .where(eq(schema.chargebackNotes.chargebackId, id))
    .all();
  const names = new Map(db.select().from(schema.users).all().map((u) => [u.id, u.name]));
  const canManage = user && ["ops_manager", "engineer"].includes(user.role);
  const canSignoff = user && ["finance_manager", "engineer"].includes(user.role);

  return (
    <>
      <p><Link href="/chargebacks">← Back to disputes</Link></p>
      <h1>{cb.merchant} <span className="muted mono">({cb.id})</span></h1>
      <table>
        <tbody>
          <tr><th>Amount</th><td>{money(cb.amountCents)}</td></tr>
          <tr><th>Reason code</th><td>{cb.networkReasonCode}</td></tr>
          <tr><th>Deadline</th><td>{cb.deadline}</td></tr>
          <tr><th>Status</th><td><span className="pill info">{cb.status.replace("_", " ")}</span></td></tr>
          <tr><th>Logged by</th><td>{names.get(cb.createdBy)}</td></tr>
          {cb.signedOffBy && <tr><th>Signed off by</th><td>{names.get(cb.signedOffBy)}</td></tr>}
        </tbody>
      </table>

      <div className="section">
        <h2>Evidence notes</h2>
        {notes.map((n) => (
          <div className="card" key={n.id} style={{ marginBottom: 8 }}>
            <p>{n.body}</p>
            <div className="meta">{names.get(n.author)} · {n.createdAt.slice(0, 16).replace("T", " ")}</div>
          </div>
        ))}
        {notes.length === 0 && <p className="muted">No evidence yet.</p>}
        {canManage && (
          <form action={addNote}>
            <input type="hidden" name="cbId" value={cb.id} />
            <label htmlFor="body">Add evidence</label>
            <textarea id="body" name="body" rows={2} style={{ width: "100%" }} />
            <div style={{ marginTop: 8 }}><button type="submit">Add note</button></div>
          </form>
        )}
      </div>

      <div className="toolbar">
        {canManage && cb.status === "open" && (
          <form action={submitForSignoff} className="inline">
            <input type="hidden" name="cbId" value={cb.id} />
            <button type="submit">Submit for finance sign-off</button>
          </form>
        )}
        {canSignoff && cb.status === "pending_signoff" && (
          <>
            <form action={resolveSignoff} className="inline">
              <input type="hidden" name="cbId" value={cb.id} />
              <input type="hidden" name="decision" value="approve" />
              <button type="submit">Sign off — send response</button>
            </form>
            <form action={resolveSignoff} className="inline">
              <input type="hidden" name="cbId" value={cb.id} />
              <input type="hidden" name="decision" value="reject" />
              <button type="submit" className="secondary">Send back to ops</button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
