import { describe, it, expect, beforeAll } from "vitest";

process.env.SQLITE_PATH = ":memory:";

describe("shared SQLite/Drizzle handle", () => {
  let mod: typeof import("../src/lib/db");
  beforeAll(async () => {
    mod = await import("../src/lib/db");
  });

  it("opens SQLite and exposes the audit_log table through Drizzle", () => {
    const rows = mod.db.select().from(mod.schema.auditLog).all();
    expect(rows).toEqual([]);
  });
});
