import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { seed } from "./seed";

const sqlite = new Database(process.env.SQLITE_PATH ?? "internalops.db");
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS charges (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'charged',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  charge_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason_code TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  decided_by TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE TABLE IF NOT EXISTS kyc_cases (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  country TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  claimed_by TEXT,
  escalated_by TEXT,
  decided_by TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chargebacks (
  id TEXT PRIMARY KEY,
  merchant TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  network_reason_code TEXT NOT NULL,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_by TEXT NOT NULL,
  signed_off_by TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chargeback_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chargeback_id TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payout_holds (
  id TEXT PRIMARY KEY,
  merchant TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  placed_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'held',
  released_by TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tool_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vendor_contracts (
  id TEXT PRIMARY KEY,
  vendor TEXT NOT NULL,
  service TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  annual_value_cents INTEGER NOT NULL,
  renewal_date TEXT NOT NULL,
  notice_days INTEGER NOT NULL,
  auto_renew INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  decision TEXT,
  decision_note TEXT,
  requested_by TEXT,
  signed_off_by TEXT,
  created_at TEXT NOT NULL
);
`);

export const db = drizzle(sqlite, { schema });
export { schema };

// Prototype convenience: seed on first run so a fresh clone works with zero
// setup. Skipped under tests (in-memory DB) and during `next build` page-data
// collection, where several workers would race the seed.
if (
  process.env.SQLITE_PATH !== ":memory:" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  sqlite
    .transaction(() => {
      const row = sqlite
        .prepare("SELECT COUNT(*) AS n FROM users")
        .get() as { n: number };
      if (row.n === 0) {
        seed(db);
      }
    })
    .immediate();
}
