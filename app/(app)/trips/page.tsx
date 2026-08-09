import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TripCard } from "@/components/home/trip-card";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { getTripsForUser } from "@/lib/server/trips";
import { formatDateRange, formatDuration } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Trips · Sage Adventurer",
};

/**
 * Real trips created via /plan, read straight from FastAPI on the server so
 * the list is in the HTML on first paint. §12: an unreachable trips service
 * degrades to the same empty state as having no trips yet, never an error.
 */
export default async function Page() {
  const cookieStore = await cookies();
  const user = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  const trips = user ? await getTripsForUser(user.id) : [];

  return (
    <div>
      <PageHeader
        title="My Trips"
        subtitle="Everything you have planned and everywhere you have been."
      />

      {trips.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No trips yet"
          description="Plan your first one and it will show up here with its itinerary and budget."
          action={{ label: "Plan your trip", href: "/plan" }}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripCard
                title={trip.event_name}
                dateRange={formatDateRange(trip.checkin, trip.checkout)}
                duration={formatDuration(trip.checkin, trip.checkout)}
                href={`/trips/${trip.id}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
