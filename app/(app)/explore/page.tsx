import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Explore · Sage Adventurer",
};

/**
 * Not built in this pass (DESIGN.md §11 route map). It is a real route with a
 * real frame rather than a dead link, so the nav never lies about where it goes.
 */
export default function Page() {
  return (
    <div>
      <PageHeader title="Explore" subtitle="Find somewhere you have never been." />
      <EmptyState
        icon={Compass}
        title="Nothing to explore yet"
        description="Recommendations appear here once Sage has learned a little about how you travel."
        action={{ label: "Plan your trip", href: "/plan" }}
      />
    </div>
  );
}
