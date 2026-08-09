import Link from "next/link";
import { Mountain } from "lucide-react";

/**
 * DESIGN.md §7 (TripCard) — 24px padding, a 52px Mist chip with the icon, then
 * a Fraunces 17/600 title over a 13px muted meta line formatted
 * `May 24 – May 28 · 3 Days` (en dash, middot).
 */
export function TripCard({
  title,
  dateRange,
  duration,
  href,
}: {
  title: string;
  /** Already formatted with an en dash, e.g. "May 24 – May 28". */
  dateRange: string;
  /** e.g. "3 Days" — the unit belongs here, not in the caller's template. */
  duration: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 shadow-page outline-none transition-[transform,box-shadow] duration-[160ms] ease-out hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span
        className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[13px] bg-accent text-foreground"
        aria-hidden="true"
      >
        <Mountain size={24} strokeWidth={1.5} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[17px] font-semibold leading-[22px] text-foreground">
          {title}
        </span>
        <span className="mt-1 block text-[13px] leading-[18px] text-muted-foreground">
          {dateRange} · {duration}
        </span>
      </span>
    </Link>
  );
}
