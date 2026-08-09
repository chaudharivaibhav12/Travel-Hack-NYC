import type { Metadata } from "next";
import { User } from "lucide-react";
import { AccountProfile } from "@/components/profile/account-profile";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Profile · Sage Adventurer",
};

export default function Page() {
  return (
    <div>
      <PageHeader title="Profile" subtitle="Your account details and sign-in information." />
      <AccountProfile />

      <section aria-labelledby="travel-profile-heading" className="mt-[34px]">
        <h2
          id="travel-profile-heading"
          className="mb-3.5 font-display text-[17px] font-semibold leading-[22px] text-foreground"
        >
          Travel Profile
        </h2>
        <EmptyState
          icon={User}
          title="Your travel profile is forming"
          description="Answer a few questions and Sage will start tuning recommendations to you."
          action={{ label: "Plan your trip", href: "/plan" }}
        />
      </section>
    </div>
  );
}
