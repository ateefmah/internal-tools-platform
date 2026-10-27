import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requirePermission, requireRole } from "@/lib/require";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The intake: ops asks for a tool in plain English. This is the request end of
// the loop a Slack automation would trigger.
async function submitRequest(formData: FormData) {
  "use server";
  const user = await requirePermission("tools.request");
  const summary = String(formData.get("summary") ?? "").trim();
  if (!summary) throw new Error("Describe the tool you need.");
  db.transaction((tx) => {
    const res = tx
      .insert(schema.toolRequests)
      .values({ requester: user.id, summary, status: "new", createdAt: new Date().toISOString() })
      .run();
    audit.record(tx, {
      actor: user.id,
      action: "tool_request.submit",
      entityType: "tool_request",
      entityId: String(res.lastInsertRowid),
      detail: summary.slice(0, 120),
    });
  });
  redirect("/requests");
}

async function setStatus(formData: FormData) {
  "use server";
  const user = await requireRole("engineer");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["new", "in_build", "shipped", "declined"].includes(status))
    throw new Error("Bad status");
  db.transaction((tx) => {
    tx.update(schema.toolRequests)
      .set({ status })
      .where(eq(schema.toolRequests.id, id))
      .run();
    audit.record(tx, {
      actor: user.id,
      action: "tool_request.status",
      entityType: "tool_request",
      entityId: String(id),
      detail: `-> ${status}`,
    });
  });
  redirect("/requests");
}

export default async function RequestsPage() {
  const user = await getCurrentUser();
  const rows = db
    .select()
    .from(schema.toolRequests)
    .orderBy(desc(schema.toolRequests.id))
    .all();
  const names = new Map(
    db.select().from(schema.users).all().map((u) => [u.id, u.name])
  );
  const isEngineer = user?.role === "engineer";
  return (
    <>
      <h1>Tool requests</h1>
      <p className="subtitle">
        The request end of the loop: ops describes a tool in plain English, an engineer picks it up, Devin builds it on this platform.
      </p>
      {user && (
        <form action={submitRequest}>
          <label htmlFor="summary">What do you need? Plain English is fine.</label>
          <textarea id="summary" name="summary" rows={3} style={{ width: "100%" }} />
          <div style={{ marginTop: 8 }}>
            <button type="submit">Submit request</button>
          </div>
        </form>
      )}
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Request</th>
            <th>From</th>
            <th>Status</th>
            {isEngineer && <th>Update</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="mono">{r.id}</td>
              <td>{r.summary}</td>
              <td>{names.get(r.requester) ?? r.requester}</td>
              <td>
                <span className={`pill ${r.status === "shipped" ? "ok" : r.status === "in_build" ? "info" : ""}`}>
                  {r.status}
                </span>
              </td>
              {isEngineer && (
                <td>
                  {["in_build", "shipped", "declined"].map((s) => (
                    <form key={s} action={setStatus} className="inline" style={{ marginRight: 6 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={s} />
                      <button type="submit" className="secondary small">
                        {s}
                      </button>
                    </form>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
