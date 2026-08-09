import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Group Trips · Sage Adventurer",
};

/**
 * Not built in this pass (DESIGN.md §11 route map). It is a real route with a
 * real frame rather than a dead link, so the nav never lies about where it goes.
 */
export default function Page() {
  return (
    <div>
      <PageHeader title="Group Trips" subtitle="Plan together without averaging anyone away." />
      <EmptyState
        icon={Users}
        title="No group trips yet"
        description="Invite the people you travel with and Sage will find a destination that works for everyone."
        action={{ label: "Plan your trip", href: "/plan" }}
      />
    </div>
  );
}
