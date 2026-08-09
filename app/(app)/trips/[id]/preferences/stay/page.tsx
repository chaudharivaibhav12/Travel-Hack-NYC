import type { Metadata } from "next";
import { WizardShell } from "@/components/preferences/wizard-shell";
import { MemberNotFound } from "@/components/preferences/member-not-found";
import { StayPreferencesForm } from "@/components/preferences/stay-form";
import { getCurrentMember } from "@/lib/server/current-member";
import { getMemberPreferences } from "@/lib/server/preferences";

export const metadata: Metadata = {
  title: "Stay preferences · Sage Adventurer",
};

interface StepParams {
  params: Promise<{ id: string }>;
}

export default async function StayPreferencesPage({ params }: StepParams) {
  const { id } = await params;
  const current = await getCurrentMember(id);
  if (!current) return <MemberNotFound />;

  const preferences = await getMemberPreferences(id, current.member.id);

  return (
    <WizardShell
      tripId={id}
      current="stay"
      title="Where do you want to stay?"
      description="Your nightly budget and what matters to you in a place — this feeds the group's hotel search."
    >
      <StayPreferencesForm tripId={id} memberId={current.member.id} initial={preferences.stay} />
    </WizardShell>
  );
}
