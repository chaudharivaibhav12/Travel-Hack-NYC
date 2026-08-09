/**
 * DESIGN.md §9 — all money goes through this file.
 * Never call toLocaleString inline in a component.
 *
 * USD, not INR. The theme mockups show ₹; MasterPrompt.md §9 fixes the demo in
 * USD for a NYC audience. Flip CURRENCY here if that ever changes.
 */

export const CURRENCY = {
  code: "USD",
  locale: "en-US",
} as const;

const formatter = new Intl.NumberFormat(CURRENCY.locale, {
  style: "currency",
  currency: CURRENCY.code,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** `1300` → `$1,300`. No decimals, grouped with commas. */
export function formatMoney(amount: number): string {
  return formatter.format(amount);
}

/** `1300, 2000` → `of $2,000` — the muted comparative line under an amount. */
export function formatMoneyComparative(total: number): string {
  return `of ${formatMoney(total)}`;
}

/** Clamped to 0 at the bottom but NOT at the top — over 100% is a real state. */
export function percentOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.round((part / whole) * 100));
}
