import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { getTrip } from "@/lib/server/trips";
import { formatDateRange, formatDuration } from "@/lib/utils";

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
 * Minimal real trip view — what /trips (My Trips) links to. Hotels, flight
 * estimates, and the AI-merged consensus land here once the preference forms
 * and their backing endpoints exist; for now this confirms the trip itself
 * was created and shows who's in it.
 */
export default async function TripDetailPage({ params }: TripPageParams) {
  const { id } = await params;
  const data = await getTrip(id);
  if (!data) notFound();

  const { trip, members } = data;

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
    </div>
  );
}
