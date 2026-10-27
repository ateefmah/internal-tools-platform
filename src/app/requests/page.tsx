import { desc } from "drizzle-orm";
import { db } from "../../lib/db";
import { toolRequests } from "../../lib/db/schema";
import { seedIfEmpty } from "../../lib/db/seed";
import { currentPersona } from "../../lib/personas";
import { submitToolRequest, triageToolRequest } from "../../lib/actions/requests";

export default async function RequestsPage() {
  seedIfEmpty();
  const persona = await currentPersona();
  const rows = db.select().from(toolRequests).orderBy(desc(toolRequests.id)).all();
  const canRequest = persona.permissions.includes("tools:request");
  const canTriage = persona.permissions.includes("tools:triage");

  return (
    <>
      <h1>Tool Requests</h1>
      <p className="subtitle">
        How app #N gets built: ops describes the tool in plain English (the same
        words they would put in Slack), engineering triages it, and it ships
        registered in src/apps/registry.ts.
      </p>

      {canRequest ? (
        <div className="card">
          <h3>Request a tool</h3>
          <form action={submitToolRequest} className="stack">
            <textarea
              name="requestText"
              rows={3}
              placeholder='e.g. "Can we get a page that flags wire transfers over $50k pending more than 24h?"'
              required
            />
            <button type="submit">Submit request</button>
          </form>
        </div>
      ) : null}

      <div className="card">
        <table>
          <thead>
            <tr><th>ID</th><th>Request</th><th>Requested by</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">#{r.id}</td>
                <td>{r.requestText}</td>
                <td>{r.requestedBy}</td>
                <td><span className={`pill ${r.status}`}>{r.status}</span></td>
                <td>
                  {canTriage && r.status === "new" ? (
                    <form action={triageToolRequest} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <span className="btn-row">
                        <button name="status" value="in_build" className="secondary">Start build</button>
                        <button name="status" value="shipped">Shipped</button>
                        <button name="status" value="rejected" className="danger">Reject</button>
                      </span>
                    </form>
                  ) : (
                    <span className="mono">{r.triagedBy ?? ""}</span>
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
