import type { Metadata } from "next";
import { WizardShell } from "@/components/preferences/wizard-shell";
import { MemberNotFound } from "@/components/preferences/member-not-found";
import { ActivitiesPreferencesForm } from "@/components/preferences/activities-form";
import { getCurrentMember } from "@/lib/server/current-member";
import { getMemberPreferences } from "@/lib/server/preferences";

export const metadata: Metadata = {
  title: "Activity preferences · Sage Adventurer",
};

interface StepParams {
  params: Promise<{ id: string }>;
}

export default async function ActivitiesPreferencesPage({ params }: StepParams) {
  const { id } = await params;
  const current = await getCurrentMember(id);
  if (!current) return <MemberNotFound />;

  const preferences = await getMemberPreferences(id, current.member.id);

  return (
    <WizardShell
      tripId={id}
      current="activities"
      title="What do you want to do?"
      description="Interests, pace, and anything you already know you don't want to miss."
    >
      <ActivitiesPreferencesForm
        tripId={id}
        memberId={current.member.id}
        initial={preferences.activities}
      />
    </WizardShell>
  );
}
