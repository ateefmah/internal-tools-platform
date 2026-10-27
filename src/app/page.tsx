import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "../lib/db";
import { auditLog } from "../lib/db/schema";
import { seedIfEmpty } from "../lib/db/seed";
import { APPS } from "../apps/registry";
import { currentPersona } from "../lib/personas";

export default async function Home() {
  seedIfEmpty();
  const persona = await currentPersona();
  const recent = db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(8).all();

  return (
    <>
      <h1>Internal tools, one platform</h1>
      <p className="subtitle">
        Signed in as {persona.name} — {persona.blurb}. Controls (roles, audit,
        approvals, PII masking) are platform-level and enforced by CI.
      </p>

      <div className="grid">
        {APPS.map((a) => (
          <Link key={a.slug} href={`/${a.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="card app-card">
              <h3>{a.name}</h3>
              <p>{a.description}</p>
              <span className="tag">{a.kind}</span>
              <span className="tag">owner: {a.owner}</span>
              {a.origin ? <span className="tag">origin: {a.origin}</span> : null}
            </div>
          </Link>
        ))}
      </div>

      <h1 style={{ marginTop: 28 }}>Latest audit entries</h1>
      <div className="card">
        <table>
          <thead>
            <tr><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th><th>Time (UTC)</th></tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id}>
                <td>{r.actor}</td>
                <td className="mono">{r.action}</td>
                <td className="mono">{r.entityType}#{r.entityId}</td>
                <td>{r.detail}</td>
                <td className="mono">{r.createdAt.slice(11, 19)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
