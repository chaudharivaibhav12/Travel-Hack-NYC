import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * DESIGN.md §8 (Empty states) — card-sized, centered, a 24px muted icon, a
 * Fraunces 17 line, one muted sentence, and AT MOST one secondary button.
 * Never a Sparkles icon (§10).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-16 text-center shadow-page">
      <Icon
        size={24}
        strokeWidth={1.5}
        className="text-muted-foreground"
        aria-hidden="true"
      />

      <p className="mt-4 font-display text-[17px] font-semibold leading-[22px] text-foreground">
        {title}
      </p>

      <p className="mt-1.5 max-w-[42ch] text-[12.5px] leading-[18px] text-muted-foreground">
        {description}
      </p>

      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold leading-5 text-foreground transition-colors duration-[160ms] ease-out hover:bg-accent hover:text-accent-foreground"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
