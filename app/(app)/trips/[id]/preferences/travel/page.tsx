import type { Metadata } from "next";
import { WizardShell } from "@/components/preferences/wizard-shell";
import { MemberNotFound } from "@/components/preferences/member-not-found";
import { TravelPreferencesForm } from "@/components/preferences/travel-form";
import { getCurrentMember } from "@/lib/server/current-member";
import { getMemberPreferences } from "@/lib/server/preferences";

export const metadata: Metadata = {
  title: "Travel preferences · Sage Adventurer",
};

interface StepParams {
  params: Promise<{ id: string }>;
}

export default async function TravelPreferencesPage({ params }: StepParams) {
  const { id } = await params;
  const current = await getCurrentMember(id);
  if (!current) return <MemberNotFound />;

  const preferences = await getMemberPreferences(id, current.member.id);

  return (
    <WizardShell
      tripId={id}
      current="travel"
      title="How are you getting there?"
      description="Your own flight details — everyone in the group fills this in separately, from their own city."
    >
      <TravelPreferencesForm
        tripId={id}
        memberId={current.member.id}
        defaultDepartureDate={current.trip.checkin}
        defaultReturnDate={current.trip.checkout}
        initial={preferences.travel}
      />
    </WizardShell>
  );
}
