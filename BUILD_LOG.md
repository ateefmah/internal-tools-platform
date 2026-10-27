# Build log

| Date | Change | Notes |
|---|---|---|
| 2026-10-27 | Fix `next build`: drop `cacheComponents`/`partialPrefetching` from `next.config.ts` | Next 16 rejects `export const dynamic = "force-dynamic"` when `cacheComponents` is on. All pages read live SQLite data and stay dynamic. |
