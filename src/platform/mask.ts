// Control 4: PII is masked server-side before it reaches the page.
// Full values are only returned by reveal.ts behind the pii:reveal permission.
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  const d = domain.split(".");
  return `${user[0] ?? "*"}***@${d[0]?.[0] ?? "*"}***.${d[d.length - 1] ?? "*"}`;
}

export function maskTaxId(taxId: string): string {
  return `***-**-${taxId.slice(-4)}`;
}
