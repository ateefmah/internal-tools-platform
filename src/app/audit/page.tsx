import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await getCurrentUser();
  const rows = db
    .select()
    .from(schema.auditLog)
    .orderBy(desc(schema.auditLog.id))
    .limit(200)
    .all();
  const names = new Map(
    db.select().from(schema.users).all().map((u) => [u.id, u.name])
  );
  return (
    <>
      <h1>Audit log</h1>
      <p className="subtitle">
        Append-only. Every write on the platform lands a row here in the same
        transaction. {user ? "Latest 200 rows." : "Sign in for full context."}
      </p>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="mono">{r.createdAt.replace("T", " ").slice(0, 19)}</td>
              <td>{names.get(r.actor) ?? r.actor}</td>
              <td className="mono">{r.action}</td>
              <td className="mono">
                {r.entityType}/{r.entityId}
              </td>
              <td className="muted">{r.detail}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No writes yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
