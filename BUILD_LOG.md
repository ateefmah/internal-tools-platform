# Build log

| Date | Change | Notes |
|---|---|---|
| 2026-10-27 | Scaffold-only baseline: Next.js (App Router) + TS, SQLite via better-sqlite3 + drizzle-orm, Vitest, one Playwright smoke test | No feature apps. Shared DB handle in `src/lib/db` (append-only `audit_log` only); empty `src/apps/registry.ts`; `tests/controls.spec.ts` kept as the CI gate. |
