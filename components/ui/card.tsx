import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md §4 — every card carries a 1px hairline border AND shadow-page.
 * Border and shadow always travel together; a card never has one without the
 * other. That pairing is baked in here so it can't be forgotten at a call site.
 */
export function Card({
  children,
  className,
  interactive = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Adds shadow-lift + a -2px translate on hover. Interactive cards only. */
  interactive?: boolean;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-border bg-card shadow-page",
        interactive &&
          "transition-[transform,box-shadow] duration-[160ms] ease-out hover:-translate-y-0.5 hover:shadow-lift",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
