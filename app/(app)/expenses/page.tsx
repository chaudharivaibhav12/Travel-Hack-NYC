import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/home/section-header";
import { BudgetRing } from "@/components/home/budget-ring";
import { Card } from "@/components/ui/card";
import { formatMoney, percentOf } from "@/lib/config/currency";
import { DEMO_BUDGET, DEMO_BUDGET_SPENT } from "@/lib/data/demo-trip";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Expenses · Sage Adventurer",
};

/**
 * DESIGN.md §11 — BudgetRing (large) plus category rows with progress bars.
 * Per-category variance (spent − planned) is exactly what MasterPrompt §5.4
 * needs so an explanation can say "over on transport, under on activities".
 * The numbers come from here; the sentence comes later from the LLM.
 */
export default function ExpensesPage() {
  const remaining = DEMO_BUDGET.total - DEMO_BUDGET_SPENT;

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={`${formatMoney(remaining)} left of ${formatMoney(DEMO_BUDGET.total)}`}
      />

      <section aria-label="Budget overview" className="mb-[34px]">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.55fr]">
          <BudgetRing
            spent={DEMO_BUDGET_SPENT}
            total={DEMO_BUDGET.total}
            size={104}
            strokeWidth={10}
          />

          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card shadow-page">
            <SummaryCell label="Spent" value={formatMoney(DEMO_BUDGET_SPENT)} bordered />
            <SummaryCell
              label="Remaining"
              value={formatMoney(remaining)}
              tone={remaining < 0 ? "negative" : "default"}
            />
          </div>
        </div>
      </section>

      <section aria-label="Spending by category">
        <SectionHeader title="By category" />

        <ul className="flex flex-col gap-3">
          {DEMO_BUDGET.categories.map((category) => {
            const percent = percentOf(category.spent, category.planned);
            const variance = category.spent - category.planned;
            const over = variance > 0;

            return (
              <Card key={category.key} as="li" className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-sm font-medium leading-5 text-foreground">
                    {category.label}
                  </span>
                  <span className="text-[13px] leading-[18px] text-muted-foreground">
                    {formatMoney(category.spent)} of{" "}
                    {formatMoney(category.planned)}
                  </span>
                </div>

                <div
                  className="mt-3 h-2 w-full overflow-hidden rounded-full bg-track"
                  role="img"
                  aria-label={`${category.label}: ${percent} percent of planned`}
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      over ? "bg-destructive" : "bg-primary",
                    )}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>

                <p
                  className={cn(
                    "mt-2 text-[12.5px] leading-[18px]",
                    over ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {over
                    ? `Over by ${formatMoney(variance)}`
                    : `Under by ${formatMoney(Math.abs(variance))}`}
                </p>
              </Card>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  bordered = false,
  tone = "default",
}: {
  label: string;
  value: string;
  bordered?: boolean;
  tone?: "default" | "negative";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-6 text-center",
        bordered && "border-r border-border",
      )}
    >
      <p
        className={cn(
          "font-display text-[26px] font-semibold leading-[30px] tracking-[-0.2px]",
          tone === "negative" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-[18px] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
