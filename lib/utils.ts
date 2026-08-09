/** Minimal class-name joiner. Avoids pulling in clsx + tailwind-merge. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** Parses a YYYY-MM-DD string as a local calendar date, not UTC midnight. */
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** "2026-05-20", "2026-05-26" -> "May 20 – May 26" (en dash, DESIGN.md §9). */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${MONTH_DAY.format(parseDateOnly(startDate))} – ${MONTH_DAY.format(parseDateOnly(endDate))}`;
}

/** "2026-05-20", "2026-05-26" -> "7 Days" (inclusive of both ends). */
export function formatDuration(startDate: string, endDate: string): string {
  const msPerDay = 24 * 60 * 60 * 1000;
  const days =
    Math.round((parseDateOnly(endDate).getTime() - parseDateOnly(startDate).getTime()) / msPerDay) + 1;
  const clamped = Math.max(days, 1);
  return `${clamped} Day${clamped === 1 ? "" : "s"}`;
}
