import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "My Trips · Sage Adventurer",
};

/**
 * Not built in this pass (DESIGN.md §11 route map). It is a real route with a
 * real frame rather than a dead link, so the nav never lies about where it goes.
 */
export default function Page() {
  return (
    <div>
      <PageHeader title="My Trips" subtitle="Everything you have planned and everywhere you have been." />
      <EmptyState
        icon={Briefcase}
        title="No trips yet"
        description="Plan your first one and it will show up here with its itinerary and budget."
        action={{ label: "Plan your trip", href: "/plan" }}
      />
    </div>
  );
}
