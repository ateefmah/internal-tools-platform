import { asc } from "drizzle-orm";
import { db } from "../../lib/db";
import { expiringItems } from "../../lib/db/schema";
import { seedIfEmpty } from "../../lib/db/seed";

export default async function ExpiryAlertsPage() {
  seedIfEmpty();
  const rows = db.select().from(expiringItems).orderBy(asc(expiringItems.daysLeft)).all();

  return (
    <>
      <h1>Expiry Alerts</h1>
      <div className="notice">
        This app was built from a plain-English Slack request by ops (see
        docs/slack-request.md). It is registered in src/apps/registry.ts.
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Program</th><th>Detail</th><th>Days left</th><th>Severity</th></tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td>{i.program}</td>
                <td>{i.detail}</td>
                <td>{i.daysLeft}</td>
                <td><span className={`pill ${i.severity}`}>{i.severity}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
