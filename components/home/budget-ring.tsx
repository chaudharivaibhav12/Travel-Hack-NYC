import { formatMoney, formatMoneyComparative, percentOf } from "@/lib/config/currency";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md §7 (BudgetRing) — 86px SVG, 9px stroke, --track background circle,
 * primary-deep progress arc, round linecap, rotated -90deg so it starts at 12
 * o'clock. The percentage sits CENTERED INSIDE the ring; it must never overlap
 * or sit outside the stroke. Over 100% turns the arc destructive.
 */
export function BudgetRing({
  spent,
  total,
  label = "Budget overview",
  size = 86,
  strokeWidth = 9,
}: {
  spent: number;
  total: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const percent = percentOf(spent, total);
  const over = percent > 100;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Cap the visual arc at a full circle even when the number goes past 100.
  const drawnFraction = Math.min(percent, 100) / 100;
  const dashOffset = circumference * (1 - drawnFraction);

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-6 py-[22px] shadow-page">
      <div className="min-w-0">
        <p className="text-[13.5px] font-bold leading-[18px] text-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 font-display text-[30px] font-semibold leading-[34px] tracking-[-0.3px]",
            over ? "text-destructive" : "text-foreground",
          )}
        >
          {formatMoney(spent)}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted-foreground">
          {formatMoneyComparative(total)}
        </p>
      </div>

      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${formatMoney(spent)} spent of ${formatMoney(total)}, ${percent} percent`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-track"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={over ? "stroke-destructive" : "stroke-primary-deep"}
          />
        </svg>

        {/* Centered inside the stroke — never overlapping it (§7). */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center text-xs font-bold leading-none",
            over ? "text-destructive" : "text-primary-deep",
          )}
        >
          {percent}%
        </span>
      </div>
    </div>
  );
}
