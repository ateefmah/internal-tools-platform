import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { APPS } from "../src/apps/registry";

/**
 * Conformance test — the CI gate for the platform controls.
 *
 * Rule 1: any source file that mutates the database (.insert/.update/.delete)
 *         must call requireRole() or requirePermission() before the write.
 * Rule 2: the same file must call audit.record() — callers pass the open
 *         transaction, which puts the audit row in the same transaction.
 * Rule 3: approval paths must call assertNotSelfApproval() — the requester
 *         can never approve their own request.
 * Rule 4: the audit table is append-only — no .update()/.delete() on auditLog
 *         anywhere in src/.
 * Rule 5: every route directory under src/app must be registered in
 *         src/apps/registry.ts.
 * Rule 6: pages that render PII fields (email, taxId) must mask them —
 *         raw values are only returned by src/platform/reveal.ts.
 */

const ROOT = join(__dirname, "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const SRC_FILES = walk(join(ROOT, "src"))
  .map((p) => relative(ROOT, p))
  // Files that legitimately write outside a guarded route: the audit writer
  // itself (it IS the control), the schema, and bootstrap/seed code.
  .filter(
    (p) =>
      !p.endsWith("platform/audit.ts") &&
      !p.endsWith("db/seed.ts") &&
      !p.endsWith("db/schema.ts") &&
      !p.endsWith("db/index.ts")
  );

// Match drizzle mutations on a db/tx handle — not Map.delete, crypto .update,
// or cookie jar.delete which are unrelated to the database.
const MUTATION = /\b(db|tx)\.(insert|update|delete)\(/;

describe("platform controls", () => {
  it("every DB write is guarded by requireRole/requirePermission", () => {
    for (const file of SRC_FILES) {
      const src = readFileSync(join(ROOT, file), "utf8");
      if (MUTATION.test(src)) {
        expect(
          /requireRole\(|requirePermission\(/.test(src),
          `${file} mutates the DB without a server-side role/permission check`
        ).toBe(true);
      }
    }
  });

  it("every DB write is paired with audit.record()", () => {
    for (const file of SRC_FILES) {
      const src = readFileSync(join(ROOT, file), "utf8");
      if (MUTATION.test(src)) {
        expect(
          /audit\.record\(/.test(src),
          `${file} mutates the DB without audit.record() in the same flow`
        ).toBe(true);
      }
    }
  });

  it("audit_log is append-only (no update/delete ever)", () => {
    for (const file of SRC_FILES) {
      const src = readFileSync(join(ROOT, file), "utf8");
      expect(
        /\.(update|delete)\(\s*auditLog/.test(src),
        `${file} mutates audit_log`
      ).toBe(false);
    }
  });

  it("approval paths enforce maker-checker (no self-approval)", () => {
    const approvalFiles = SRC_FILES.filter((f) => {
      const src = readFileSync(join(ROOT, f), "utf8");
      return /approve|secondReview|resolve|triage/.test(src) && MUTATION.test(src);
    });
    for (const file of approvalFiles) {
      const src = readFileSync(join(ROOT, file), "utf8");
      expect(
        /assertNotSelfApproval\(/.test(src),
        `${file} has an approval write without assertNotSelfApproval()`
      ).toBe(true);
    }
  });

  it("every app route is registered in src/apps/registry.ts", () => {
    const slugs = new Set(APPS.map((a) => a.slug));
    const appDir = join(ROOT, "src", "app");
    for (const name of readdirSync(appDir)) {
      const p = join(appDir, name);
      if (!statSync(p).isDirectory() || name.startsWith("[")) continue;
      if (!readdirSync(p).includes("page.tsx")) continue;
      expect(slugs.has(name), `route /${name} is not in the app registry`).toBe(true);
    }
  });

  it("pages rendering PII mask it (reveal only via platform/reveal)", () => {
    const pageFiles = walk(join(ROOT, "src", "app")).map((p) => relative(ROOT, p));
    for (const file of pageFiles) {
      const src = readFileSync(join(ROOT, file), "utf8");
      if (/\.email|taxId/.test(src)) {
        expect(
          /mask(Email|TaxId)\(/.test(src),
          `${file} touches PII fields without masking`
        ).toBe(true);
      }
    }
  });
});
