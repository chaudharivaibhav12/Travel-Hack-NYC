"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DESIGN.md §7 (AuthCard) — 44px tall, bg-card, border-input, rounded-md,
 * focus ring-2 ring-ring. Label is DM Sans 12.5/500.
 */
export function Field({
  label,
  type = "text",
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === "password";
  const resolvedType = isPassword && revealed ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[12.5px] font-medium leading-[18px] text-foreground"
      >
        {label}
      </label>

      <div className="relative">
        <input
          {...props}
          id={id}
          type={resolvedType}
          className={cn(
            "h-11 w-full rounded-md border border-input bg-card px-3.5",
            "text-[14.5px] leading-5 text-foreground placeholder:text-muted-foreground",
            "outline-none transition-[box-shadow,border-color] duration-[140ms] ease-out",
            "focus:border-transparent focus:ring-2 focus:ring-ring",
            isPassword && "pr-11",
            className,
          )}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className={cn(
              "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2",
              "text-muted-foreground transition-colors duration-[140ms]",
              "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {revealed ? (
              <EyeOff size={16} strokeWidth={1.5} />
            ) : (
              <Eye size={16} strokeWidth={1.5} />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
