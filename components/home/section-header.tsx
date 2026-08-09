import Link from "next/link";

/**
 * DESIGN.md §7 (SectionHeader) — Fraunces 18/600 heading, optional action link
 * in primary-deep 13/500 baseline-aligned on the right. Link hover adds an
 * underline only, never a background. Action labels are two words max.
 */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-4">
      <h2 className="font-display text-lg font-semibold leading-6 text-foreground">
        {title}
      </h2>

      {action ? (
        <Link
          href={action.href}
          className="shrink-0 text-[13px] font-medium leading-[18px] text-primary-deep hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
