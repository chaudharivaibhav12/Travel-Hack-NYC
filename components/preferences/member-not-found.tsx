import { Briefcase } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Rendered instead of a step form when getCurrentMember() can't resolve a
 * member row — the trip doesn't exist, or the signed-in user isn't part of
 * it. A real screen with a way back, not a bare 404 (DESIGN.md §11).
 */
export function MemberNotFound() {
  return (
    <div>
      <PageHeader title="Trip not found" subtitle="This trip doesn't exist, or you're not part of it yet." />
      <EmptyState
        icon={Briefcase}
        title="Nothing here"
        description="Head back to My Trips and pick a trip you're part of."
        action={{ label: "My Trips", href: "/trips" }}
      />
    </div>
  );
}
