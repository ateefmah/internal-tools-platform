import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

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
CREATE TABLE IF NOT EXISTS refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_ref TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  decided_by TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kyc_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_ref TEXT NOT NULL,
  risk TEXT NOT NULL,
  status TEXT NOT NULL,
  email TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  decision_note TEXT,
  first_decision_by TEXT,
  decided_by TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS chargebacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  txn_ref TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason_code TEXT NOT NULL,
  status TEXT NOT NULL,
  contested_by TEXT,
  resolved_by TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tool_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_text TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL,
  triaged_by TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS expiring_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program TEXT NOT NULL,
  detail TEXT NOT NULL,
  days_left INTEGER NOT NULL,
  severity TEXT NOT NULL
);
`);

export const db = drizzle(sqlite, { schema });
export { schema };
