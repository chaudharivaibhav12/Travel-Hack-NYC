import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * DESIGN.md §7 (PromptBanner) — full-width Mist row with a #C9D8CF border,
 * 19px/22px padding. The whole banner is clickable and the arrow slides +3px
 * on hover. Exactly one banner per screen.
 */
export function PromptBanner({
  message,
  href,
}: {
  message: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-lg border border-accent-border bg-accent px-[22px] py-[19px] outline-none transition-colors duration-[160ms] ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="text-sm leading-[21px] text-accent-foreground">
        {message}
      </span>

      <ArrowRight
        size={17}
        strokeWidth={1.5}
        aria-hidden="true"
        className="shrink-0 text-primary-deep transition-transform duration-[160ms] ease-out group-hover:translate-x-[3px]"
      />
    </Link>
  );
}
