import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Info, Plane, UtensilsCrossed, BedDouble, Compass } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TagList } from "@/components/plan/tag-list";
import { getTripPlan } from "@/lib/server/plan";
import { formatDateRange } from "@/lib/utils";
import {
  PROPERTY_TYPE_OPTIONS,
  VIBE_OPTIONS,
  NEEDS_OPTIONS,
  CUISINE_OPTIONS,
  DIETARY_OPTIONS,
  MEAL_BUDGET_OPTIONS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
  optionLabel,
} from "@/lib/data/preferences-options";

interface PlanPageParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PlanPageParams): Promise<Metadata> {
  const { id } = await params;
  const plan = await getTripPlan(id);
  return {
    title: plan ? `${plan.trip.event_name} plan · Sage Adventurer` : "Trip plan · Sage Adventurer",
  };
}

function labels(options: typeof PROPERTY_TYPE_OPTIONS, values: readonly string[]): string[] {
  return values.map((value) => optionLabel(options, value));
}

/**
 * The deterministic group consensus + live hotel search from
 * GET /trips/{id}/plan. No AI narrative yet (needs ANTHROPIC_API_KEY) and no
 * live flight fares (needs AEROXPLORER_TOKEN) — `notes` says so plainly
 * rather than the page pretending those pieces are there.
 */
export default async function TripPlanPage({ params }: PlanPageParams) {
  const { id } = await params;
  const plan = await getTripPlan(id);
  if (!plan) notFound();

  const { trip, consensus, hotels, members_completed, members_total, notes } = plan;

  return (
    <div>
      <PageHeader
        title={`${trip.event_name} — Plan`}
        subtitle={`${members_completed} of ${members_total} travelers have filled in preferences · ${formatDateRange(trip.checkin, trip.checkout)}`}
      />

      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2.5">
            <BedDouble size={18} strokeWidth={1.5} className="text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold leading-6 text-foreground">Stay</h2>
          </div>

          <p className="text-sm leading-5 text-foreground">
            {consensus.stay.budget_min != null && consensus.stay.budget_max != null
              ? `$${consensus.stay.budget_min}–$${consensus.stay.budget_max} per night`
              : "No budget set yet."}
          </p>

          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium leading-[18px] text-foreground">Property types</p>
              <TagList items={labels(PROPERTY_TYPE_OPTIONS, consensus.stay.property_types)} />
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium leading-[18px] text-foreground">Vibe</p>
              <TagList items={labels(VIBE_OPTIONS, consensus.stay.vibes)} />
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium leading-[18px] text-foreground">Must-haves</p>
              <TagList items={labels(NEEDS_OPTIONS, consensus.stay.needs)} />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2.5">
            <UtensilsCrossed size={18} strokeWidth={1.5} className="text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold leading-6 text-foreground">Food</h2>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium leading-[18px] text-foreground">Cuisines</p>
              <TagList items={labels(CUISINE_OPTIONS, consensus.food.cuisines)} />
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium leading-[18px] text-foreground">
                Dietary restrictions — the whole group must respect these
              </p>
              <TagList
                items={labels(DIETARY_OPTIONS, consensus.food.dietary)}
                empty="Nobody's flagged a restriction."
              />
            </div>
            <p className="text-[12.5px] leading-[18px] text-muted-foreground">
              Meal budget:{" "}
              {consensus.food.meal_budget
                ? optionLabel(MEAL_BUDGET_OPTIONS, consensus.food.meal_budget)
                : "not set"}
            </p>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2.5">
            <Compass size={18} strokeWidth={1.5} className="text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold leading-6 text-foreground">Activities</h2>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium leading-[18px] text-foreground">Interests</p>
              <TagList items={labels(INTEREST_OPTIONS, consensus.activities.interests)} />
            </div>
            <p className="text-[12.5px] leading-[18px] text-muted-foreground">
              Pace: {consensus.activities.pace ? optionLabel(PACE_OPTIONS, consensus.activities.pace) : "not set"}
            </p>
            {consensus.activities.must_sees.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[12.5px] font-medium leading-[18px] text-foreground">Must-sees</p>
                <ul className="flex flex-col gap-1">
                  {consensus.activities.must_sees.map((entry) => (
                    <li key={entry.name} className="text-sm leading-5 text-foreground">
                      <span className="font-medium">{entry.name}:</span> {entry.must_sees}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2.5">
            <Plane size={18} strokeWidth={1.5} className="text-muted-foreground" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold leading-6 text-foreground">Flights</h2>
          </div>

          {consensus.flights.groups.length === 0 ? (
            <p className="text-[12.5px] leading-[18px] text-muted-foreground">
              Nobody&rsquo;s set their travel dates yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {consensus.flights.groups.map((group) => (
                <li
                  key={group.date}
                  className="flex items-center gap-2.5 text-sm leading-5 text-foreground"
                >
                  <CalendarDays
                    size={16}
                    strokeWidth={1.5}
                    className="shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="font-medium">{group.date}</span>
                  <span className="text-muted-foreground">— {group.members.join(", ")}</span>
                </li>
              ))}
            </ul>
          )}

          {consensus.flights.warnings.length > 0 ? (
            <ul className="flex flex-col gap-1 border-t border-border pt-3">
              {consensus.flights.warnings.map((warning) => (
                <li key={warning} className="text-[12.5px] leading-[18px] text-destructive">
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <section aria-label="Hotels">
          <h2 className="mb-3.5 font-display text-lg font-semibold leading-6 text-foreground">
            Hotels near {trip.event_location}
          </h2>

          {hotels.available && hotels.accommodations.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {hotels.accommodations.map((hotel) => (
                <li key={hotel.id || hotel.name}>
                  <Card className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-display text-[15px] font-semibold leading-5 text-foreground">
                          {hotel.name}
                        </p>
                        <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted-foreground">
                          {hotel.address}
                        </p>
                      </div>
                      {hotel.price_per_night != null ? (
                        <p className="shrink-0 text-right text-sm font-semibold leading-5 text-foreground">
                          ${hotel.price_per_night}
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            / night
                          </span>
                        </p>
                      ) : null}
                    </div>

                    {hotel.booking_links.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {hotel.booking_links.map((link) => (
                          <a
                            key={link.supplier}
                            href={link.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[12.5px] font-medium text-primary-deep hover:underline"
                          >
                            {link.supplier}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={BedDouble}
              title="No hotel results yet"
              description="Needs a stay budget from at least one traveler, or Stay22 may be rate-limited (demo mode allows 5 requests/min)."
            />
          )}
        </section>

        {notes.length > 0 ? (
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
            {notes.map((note) => (
              <p
                key={note}
                className="flex items-start gap-2 text-[12.5px] leading-[18px] text-muted-foreground"
              >
                <Info size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                {note}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
