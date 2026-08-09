import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Notifications · Sage Adventurer",
};

/**
 * Not built in this pass (DESIGN.md §11 route map). It is a real route with a
 * real frame rather than a dead link, so the nav never lies about where it goes.
 */
export default function Page() {
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Updates about your trips and plans." />
      <EmptyState
        icon={Bell}
        title="You are all caught up"
        description="Budget alerts, group activity, and plan changes will land here."
        action={{ label: "Back to home", href: "/" }}
      />
    </div>
  );
}
