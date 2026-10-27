import { createHash } from "node:crypto";

// Every refund request carries an idempotency key (stored UNIQUE). A retry
// with the same key returns the existing refund instead of paying twice.
export function makeIdempotencyKey(parts: (string | number)[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}
