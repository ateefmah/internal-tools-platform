// Server-side PII masking. Pages render masked values; the raw value is only
// returned through src/lib/reveal.ts, which needs a permission and audits it.
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const head = local.slice(0, 2);
  return `${head}${"•".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export function maskTaxId(taxId: string): string {
  const tail = taxId.slice(-4);
  return `•••-••-${tail}`;
}

export function money(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
