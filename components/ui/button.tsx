import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md §7 — three variants only. Never the default shadcn slate/black
 * look, never two primary CTAs in the same section.
 */
type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-deep border border-transparent",
  secondary:
    "bg-card text-foreground border border-border hover:bg-accent hover:text-accent-foreground",
  ghost:
    "bg-transparent text-foreground border border-transparent hover:bg-accent hover:text-accent-foreground",
};

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  fullWidth?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5",
        "text-sm font-semibold leading-5",
        "transition-[background-color,transform,box-shadow] duration-[160ms] ease-out",
        "active:scale-[0.99]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        VARIANT_CLASSES[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
