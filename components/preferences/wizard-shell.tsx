import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PREFERENCES_STEPS, stepIndex, type PreferencesStep } from "@/lib/data/preferences-steps";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the four-step trip-preferences wizard (Travel → Stay →
 * Food → Activities): progress dots, a back link to the previous step (or
 * the trip page on step 1), and a heading. Each step page brings its own
 * form as `children` — this never holds form state itself.
 */
export function WizardShell({
  tripId,
  current,
  title,
  description,
  children,
}: {
  tripId: string;
  current: PreferencesStep["key"];
  title: string;
  description: string;
  children: ReactNode;
}) {
  const index = stepIndex(current);
  const backHref =
    index <= 0 ? `/trips/${tripId}` : `/trips/${tripId}/preferences/${PREFERENCES_STEPS[index - 1].key}`;

  return (
    <div>
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium leading-[18px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
        Back
      </Link>

      <div
        className="mb-6 flex items-center gap-2"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={PREFERENCES_STEPS.length}
        aria-label={`Step ${index + 1} of ${PREFERENCES_STEPS.length}`}
      >
        {PREFERENCES_STEPS.map((step, i) => (
          <span
            key={step.key}
            aria-hidden="true"
            className={cn("h-1.5 flex-1 rounded-full", i <= index ? "bg-primary" : "bg-border")}
          />
        ))}
      </div>

      <p className="mb-1.5 text-[12.5px] font-medium leading-[18px] text-primary-deep">
        Step {index + 1} of {PREFERENCES_STEPS.length}
      </p>
      <h1 className="mb-1.5 font-display text-[22px] font-medium leading-7 text-foreground">
        {title}
      </h1>
      <p className="mb-6 max-w-[52ch] text-[12.5px] leading-[18px] text-muted-foreground">
        {description}
      </p>

      {children}
    </div>
  );
}
