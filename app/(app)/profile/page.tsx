import type { Metadata } from "next";
import { User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Profile · Sage Adventurer",
};

/**
 * Not built in this pass (DESIGN.md §11 route map). It is a real route with a
 * real frame rather than a dead link, so the nav never lies about where it goes.
 */
export default function Page() {
  return (
    <div>
      <PageHeader title="Profile" subtitle="What Sage has learned about how you travel." />
      <EmptyState
        icon={User}
        title="Your travel profile is forming"
        description="Answer a few questions and Sage will start tuning recommendations to you."
        action={{ label: "Plan your trip", href: "/plan" }}
      />
    </div>
  );
}
