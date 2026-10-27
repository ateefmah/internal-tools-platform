# The Slack request that produced Expiry Alerts

Posted in #ops-requests (simulated for this prototype):

> **Tom Aldridge (ops manager)** — last Tuesday, 9:14 AM
> can we get a page that lists card programs expiring in the next 30 days?
> compliance keeps missing renewals and it's becoming a scramble every quarter

How it went through the platform:

1. The request was logged in the Tool Requests intake (ops manager persona).
2. An engineer triaged it to `in_build`, then `shipped`.
3. Devin built the app: one read-only page at `/expiry-alerts`, a seeded
   `expiring_items` table, and a registry entry in `src/apps/registry.ts`.
4. It needs no write routes, so the conformance test requires no extra
   controls on it. Any app it grows into (e.g. "snooze an alert") would
   inherit requireRole + audit.record automatically — CI fails otherwise.

This is the pattern for the 10+ planned apps: the requester never leaves
Slack/plain English, the controls come from the platform, and registration
is enforced by the registry test.
