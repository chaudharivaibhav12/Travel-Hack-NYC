import { Compass, NotebookPen, Users, Wallet } from "lucide-react";
import { GreetingHeader } from "@/components/home/greeting-header";
import { SearchBar } from "@/components/home/search-bar";
import { QuickActionTile } from "@/components/home/quick-action-tile";
import { SectionHeader } from "@/components/home/section-header";
import { TripCard } from "@/components/home/trip-card";
import { BudgetRing } from "@/components/home/budget-ring";
import { StatStrip } from "@/components/home/stat-strip";
import { PromptBanner } from "@/components/home/prompt-banner";
import { DEMO_BUDGET, DEMO_BUDGET_SPENT, DEMO_TRIP } from "@/lib/data/demo-trip";

/**
 * Home dashboard — DESIGN.md §6 layout, §7 components.
 * Exactly 4 quick actions, exactly 4 stat cells, exactly one banner (§10).
 */

/** §7 fixes this copy. Do not reword or reorder. */
const QUICK_ACTIONS = [
  {
    title: "Surprise Me",
    subtitle: ["Take me somewhere", "I've never been"],
    href: "/explore",
    icon: Compass,
  },
  {
    title: "Plan a Trip",
    subtitle: ["Build your", "perfect itinerary"],
    href: "/plan",
    icon: NotebookPen,
  },
  {
    title: "Group Plan",
    subtitle: ["Plan together", "with friends"],
    href: "/trips/group",
    icon: Users,
  },
  {
    title: "Budget Smart",
    subtitle: ["Stay on track", "with your budget"],
    href: "/expenses",
    icon: Wallet,
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-[34px]">
      <div className="flex flex-col gap-5">
        <GreetingHeader />
        <SearchBar />
      </div>

      <section aria-label="Quick actions">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action, index) => (
            <QuickActionTile
              key={action.title}
              title={action.title}
              subtitle={action.subtitle}
              href={action.href}
              icon={action.icon}
              index={index}
            />
          ))}
        </div>
      </section>

      <section aria-label="Upcoming trip">
        <SectionHeader
          title="Upcoming trip"
          action={{ label: "View all", href: "/trips" }}
        />
        {/* Asymmetric 1.55fr / 1fr — the trip card is wider than the budget (§6). */}
        <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <TripCard
            title={DEMO_TRIP.title}
            dateRange={DEMO_TRIP.dateRange}
            duration={DEMO_TRIP.duration}
            href="/plan"
          />
          <BudgetRing spent={DEMO_BUDGET_SPENT} total={DEMO_BUDGET.total} />
        </div>
      </section>

      <section aria-label="Itinerary summary">
        <SectionHeader
          title="Your itinerary at a glance"
          action={{ label: "View plan", href: "/plan" }}
        />
        <StatStrip stats={DEMO_TRIP.stats} />
      </section>

      <section aria-label="Continue planning">
        <p className="mb-3.5 font-display text-[17px] font-semibold leading-[22px] text-foreground">
          Let&apos;s continue planning
        </p>
        <PromptBanner
          message="Add preferences to get better recommendations"
          href="/profile"
        />
      </section>
    </div>
  );
}
