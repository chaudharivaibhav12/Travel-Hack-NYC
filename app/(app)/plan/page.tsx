import type { Metadata } from "next";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/home/section-header";
import { StatStrip } from "@/components/home/stat-strip";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEMO_ITINERARY, DEMO_TRIP } from "@/lib/data/demo-trip";

export const metadata: Metadata = {
  title: "Plan your trip · Sage Adventurer",
};

/**
 * DESIGN.md §11 — a day-by-day timeline of TripCard-style rows.
 * Static data for now; D2's engine feeds this later.
 */
export default function PlanPage() {
  return (
    <div>
      <PageHeader
        title="Plan your trip"
        subtitle={`${DEMO_TRIP.title} · ${DEMO_TRIP.dateRange}`}
      />

      <section aria-label="Trip summary" className="mb-[34px]">
        <StatStrip stats={DEMO_TRIP.stats} />
      </section>

      <section aria-label="Itinerary">
        <SectionHeader
          title="Day by day"
          action={{ label: "View all", href: "/trips" }}
        />

        <ol className="flex flex-col gap-4">
          {DEMO_ITINERARY.map((day) => (
            <Card key={day.day} as="li" className="p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="font-display text-[17px] font-semibold leading-[22px] text-foreground">
                  Day {day.day} · {day.place}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[13px] leading-[18px] text-muted-foreground">
                  <CalendarDays size={14} strokeWidth={1.5} aria-hidden="true" />
                  {day.date}
                </span>
              </div>

              <ul className="mt-4 flex flex-col gap-3">
                {day.items.map((item) => (
                  <li
                    key={`${day.day}-${item.time}`}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-accent text-foreground"
                      aria-hidden="true"
                    >
                      <MapPin size={16} strokeWidth={1.5} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-5 text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] leading-[18px] text-muted-foreground">
                        {item.time} · {item.kind}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </ol>

        {/* One CTA for this section only — never two side by side (§7). */}
        <div className="mt-5">
          <Button type="button">
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Add a day
          </Button>
        </div>
      </section>
    </div>
  );
}
