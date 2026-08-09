"use client";

import { cn } from "@/lib/utils";

export interface ChipOption {
  value: string;
  label: string;
}

function Chip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-[13px] font-medium leading-[18px]",
        "outline-none transition-colors duration-[140ms] ease-out",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  );
}

/**
 * Toggle any number of options on — used for array preference fields
 * (property types, vibes, cuisines, ...). Same pill recipe as Button, sized
 * down for a dense field group (DESIGN.md §7).
 */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly ChipOption[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  function toggle(optionValue: string) {
    onChange(
      value.includes(optionValue)
        ? value.filter((entry) => entry !== optionValue)
        : [...value, optionValue],
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium leading-[18px] text-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={value.includes(option.value)}
            onClick={() => toggle(option.value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

/** Exactly one option active at a time — same pill recipe as ChipSelect. */
export function ChipRadio({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly ChipOption[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium leading-[18px] text-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={value === option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
