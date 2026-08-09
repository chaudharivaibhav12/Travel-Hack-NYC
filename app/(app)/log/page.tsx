import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Travel Log · Sage Adventurer",
};

/**
 * Not built in this pass (DESIGN.md §11 route map). It is a real route with a
 * real frame rather than a dead link, so the nav never lies about where it goes.
 */
export default function Page() {
  return (
    <div>
      <PageHeader title="Travel Log" subtitle="A record of where you have been." />
      <EmptyState
        icon={BookOpen}
        title="Your log is empty"
        description="Completed trips are collected here so Sage can learn from what you actually enjoyed."
        action={{ label: "Plan your trip", href: "/plan" }}
      />
    </div>
  );
}
