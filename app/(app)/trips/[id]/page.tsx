import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { CalendarDays, MapPin, Users, CircleCheck, Circle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { getTrip } from "@/lib/server/trips";
import { getMemberPreferences } from "@/lib/server/preferences";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { formatDateRange, formatDuration } from "@/lib/utils";
import { PREFERENCES_STEPS } from "@/lib/data/preferences-steps";

interface TripPageParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TripPageParams): Promise<Metadata> {
  const { id } = await params;
  const data = await getTrip(id);
  return {
    title: data ? `${data.trip.event_name} · Sage Adventurer` : "Trip · Sage Adventurer",
  };
}

/**
 * Trip summary + the signed-in member's own preferences progress. Hotels,
 * flight estimates, and the AI-merged consensus land here once the whole
 * group has filled these in and the search endpoints exist.
 */
export default async function TripDetailPage({ params }: TripPageParams) {
  const { id } = await params;
  const data = await getTrip(id);
  if (!data) notFound();

  const { trip, members } = data;

  const cookieStore = await cookies();
  const user = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  const myMember = user ? members.find((member) => member.user_id === user.id) : undefined;
  const myPreferences = myMember ? await getMemberPreferences(id, myMember.id) : null;

  const completedCount = myPreferences
    ? PREFERENCES_STEPS.filter((step) => myPreferences[step.key] != null).length
    : 0;
  const allDone = completedCount === PREFERENCES_STEPS.length;
  const firstIncomplete = PREFERENCES_STEPS.find((step) => myPreferences?.[step.key] == null);
  const wizardHref = `/trips/${id}/preferences/${(firstIncomplete ?? PREFERENCES_STEPS[0]).key}`;
  const ctaLabel = allDone ? "Edit preferences" : completedCount > 0 ? "Continue" : "Add your preferences";

  return (
    <div>
      <PageHeader
        title={trip.event_name}
        subtitle={`${trip.event_location} · ${formatDateRange(trip.checkin, trip.checkout)}`}
      />

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3 text-sm leading-5 text-foreground">
          <MapPin size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          {trip.event_location}
        </div>

        <div className="flex items-center gap-3 text-sm leading-5 text-foreground">
          <CalendarDays size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          {formatDateRange(trip.checkin, trip.checkout)} · {formatDuration(trip.checkin, trip.checkout)}
        </div>

        <div className="flex items-center gap-3 text-sm leading-5 text-foreground">
          <Users size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          {members.length} {members.length === 1 ? "member" : "members"}
        </div>
      </Card>

      {myMember ? (
        <section aria-label="Your preferences" className="mt-6">
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-semibold leading-6 text-foreground">
                Your preferences
              </h2>
              <span className="text-[12.5px] leading-[18px] text-muted-foreground">
                {completedCount} of {PREFERENCES_STEPS.length} done
              </span>
            </div>

            <ul className="flex flex-col gap-2.5">
              {PREFERENCES_STEPS.map((step) => {
                const done = myPreferences?.[step.key] != null;
                return (
                  <li
                    key={step.key}
                    className="flex items-center gap-2.5 text-sm leading-5 text-foreground"
                  >
                    {done ? (
                      <CircleCheck
                        size={16}
                        strokeWidth={1.5}
                        className="shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        size={16}
                        strokeWidth={1.5}
                        className="shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    {step.label}
                  </li>
                );
              })}
            </ul>

            {/* One CTA for this section only — never two side by side (§7). */}
            <Link
              href={wizardHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-transparent bg-primary px-5 py-2.5 text-sm font-semibold leading-5 text-primary-foreground transition-[background-color,transform,box-shadow] duration-[160ms] ease-out hover:bg-primary-deep active:scale-[0.99]"
            >
              {ctaLabel}
            </Link>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
