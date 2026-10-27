export const REASON_CODES = [
  "duplicate_charge",
  "fraud_reported",
  "service_outage",
  "customer_request",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];
