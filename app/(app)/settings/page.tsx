import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Settings · Sage Adventurer",
};

/**
 * Not built in this pass (DESIGN.md §11 route map). It is a real route with a
 * real frame rather than a dead link, so the nav never lies about where it goes.
 */
export default function Page() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Preferences, account, and app options." />
      <EmptyState
        icon={Settings}
        title="Nothing to configure yet"
        description="Account and notification settings arrive alongside the Supabase integration."
        action={{ label: "Back to home", href: "/" }}
      />
    </div>
  );
}
