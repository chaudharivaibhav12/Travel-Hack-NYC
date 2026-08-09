import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md §7 (QuickActionTile) — 20px padding, 24px icon with 14px bottom
 * margin, bold title, two-line 12.5px muted subtitle. Odd-indexed tiles are
 * Mist, even-indexed are card. That alternation is deliberate — do not "fix" it.
 */
export function QuickActionTile({
  title,
  subtitle,
  href,
  icon: Icon,
  index,
}: {
  title: string;
  /** Two lines, exactly as spec'd in §7. */
  subtitle: readonly [string, string];
  href: string;
  icon: LucideIcon;
  index: number;
}) {
  const isMist = index % 2 === 1;

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col rounded-lg border border-border p-5 shadow-page outline-none",
        "transition-[transform,box-shadow] duration-[160ms] ease-out",
        "hover:-translate-y-0.5 hover:shadow-lift",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isMist ? "bg-accent" : "bg-card",
      )}
    >
      <Icon
        size={24}
        strokeWidth={1.5}
        className="mb-3.5 text-foreground"
        aria-hidden="true"
      />

      <span className="text-[14.5px] font-bold leading-5 tracking-[0.1px] text-foreground">
        {title}
      </span>

      <span className="mt-1 text-[12.5px] leading-[18px] text-muted-foreground">
        {subtitle[0]}
        <br />
        {subtitle[1]}
      </span>
    </Link>
  );
}
