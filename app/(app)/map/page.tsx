import type { Metadata } from "next";
import { Map } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Map · Sage Adventurer",
};

/**
 * Not built in this pass (DESIGN.md §11 route map). It is a real route with a
 * real frame rather than a dead link, so the nav never lies about where it goes.
 */
export default function Page() {
  return (
    <div>
      <PageHeader title="Map" subtitle="See your trip laid out geographically." />
      <EmptyState
        icon={Map}
        title="No map to show"
        description="Once a trip has destinations on it, they appear here on the map."
        action={{ label: "Plan your trip", href: "/plan" }}
      />
    </div>
  );
}
