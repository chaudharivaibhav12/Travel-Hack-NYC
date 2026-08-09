import { cn } from "@/lib/utils";

/**
 * DESIGN.md §5 — a 34px rounded square filled Pine Green holding a mountain
 * glyph in Alpine Blue, beside the two-line "Sage / Adventurer" wordmark.
 * Never a Sparkles icon (MasterPrompt §11).
 */
export function BrandMark({
  size = 34,
  className,
  tone = "onDark",
}: {
  size?: number;
  className?: string;
  /** `onDark` sits on the Alpine Blue sidebar; `onLight` on Snow. */
  tone?: "onDark" | "onLight";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px]",
        tone === "onDark" ? "bg-sidebar-primary" : "bg-primary",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        className={tone === "onDark" ? "text-sidebar" : "text-primary-foreground"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Two peaks with a snowline notch — reads at 20px. */}
        <path d="M2 19.5 L9 6.5 L13 13 L15.5 9 L22 19.5 Z" />
        <path d="M6.6 12.6 L9 8.2 L11.2 11.6" className="opacity-45" />
      </svg>
    </span>
  );
}

export function BrandLockup({
  tone = "onDark",
  className,
}: {
  tone?: "onDark" | "onLight";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark tone={tone} />
      <span
        className={cn(
          "font-display text-base font-semibold leading-[1.05]",
          tone === "onDark" ? "text-sidebar-foreground" : "text-foreground",
        )}
      >
        Sage
        <br />
        Adventurer
      </span>
    </span>
  );
}
