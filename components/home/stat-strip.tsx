/**
 * DESIGN.md §7 (StatStrip) — ONE bordered container with overflow-hidden,
 * divided into 4 equal cells by 1px right-dividers (last cell has none).
 * Below 768px it becomes 2×2 with dividers on both axes.
 *
 * Numbers are bare integers; the unit lives in the label below.
 */
export interface Stat {
  value: number;
  label: string;
}

export function StatStrip({ stats }: { stats: readonly Stat[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-card shadow-page md:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cellDividers(index, stats.length)}
        >
          <p className="font-display text-[26px] font-semibold leading-[30px] tracking-[-0.2px] text-foreground">
            {stat.value}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-[18px] text-muted-foreground">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * 2×2 on mobile needs a bottom divider on the top row and a right divider on
 * the left column. At md the grid is 4-up, so only the right divider applies
 * and the last cell drops it.
 */
function cellDividers(index: number, count: number): string {
  const classes = ["flex flex-col items-center justify-center px-4 py-6 text-center"];

  // Mobile 2×2: right divider on even indexes, bottom divider on the first row.
  if (index % 2 === 0) classes.push("border-r border-border");
  if (index < 2) classes.push("border-b border-border");

  // md and up: reset the mobile rules, then apply the single 4-up rule.
  classes.push("md:border-b-0");
  classes.push(index === count - 1 ? "md:border-r-0" : "md:border-r");

  return classes.join(" ");
}
