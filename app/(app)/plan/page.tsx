import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { NewTripForm } from "@/components/plan/new-trip-form";

export const metadata: Metadata = {
  title: "Plan your trip · Sage Adventurer",
};

/**
 * Real trip creation (DESIGN.md §11 route map), not the static Kazbegi
 * preview this used to render. Submitting creates a row in Supabase via
 * FastAPI's /trips and lands on My Trips, where it now shows up for real.
 * The day-by-day itinerary view comes later, once there's a planning engine
 * to generate one from actual member preferences.
 */
export default function PlanPage() {
  return (
    <div>
      <PageHeader
        title="Plan your trip"
        subtitle="Give it a name, a destination, and dates — everyone else fills in their own preferences after."
      />
      <NewTripForm />
    </div>
  );
}
