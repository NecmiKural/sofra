export function formatMoney(minor: number, currency: string, lang = "tr"): string {
  const locale = lang === "tr" ? "tr-TR" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

export function toMinor(value: string | number): number {
  const n = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}
