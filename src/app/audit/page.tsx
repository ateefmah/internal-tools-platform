import { desc } from "drizzle-orm";
import { db } from "../../platform/db";
import { auditLog } from "../../platform/db/schema";
import { seedIfEmpty } from "../../platform/db/seed";


export default async function AuditPage() {
  seedIfEmpty();
  const rows = db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(100).all();

  return (
    <>
      <h1>Audit Log</h1>
      <p className="subtitle">
        Append-only. Every controlled write records an entry in the same
        transaction — CI fails if a write skips it.
      </p>
      <div className="card">
        <table>
          <thead>
            <tr><th>#</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th><th>Time (UTC)</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td>{r.actor}</td>
                <td className="mono">{r.action}</td>
                <td className="mono">{r.entityType}#{r.entityId}</td>
                <td>{r.detail}</td>
                <td className="mono">{r.createdAt.replace("T", " ").slice(0, 19)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
