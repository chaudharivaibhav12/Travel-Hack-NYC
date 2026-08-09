import { CalendarDays, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/home/section-header";
import { StatStrip } from "@/components/home/stat-strip";
import { DEMO_ITINERARY, DEMO_TRIP } from "@/lib/data/demo-trip";

export function DemoItinerary() {
  return (
    <section aria-label="Demo itinerary preview" className="mt-[34px]">
      <SectionHeader title="Demo itinerary preview" />
      <div className="mb-5">
        <StatStrip stats={DEMO_TRIP.stats} />
      </div>

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
                <li key={`${day.day}-${item.time}`} className="flex items-start gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[13px] bg-accent text-foreground">
                    <MapPin size={16} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-5 text-foreground">{item.title}</span>
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
    </section>
  );
}
