import type { Metadata } from "next";
import { WizardShell } from "@/components/preferences/wizard-shell";
import { MemberNotFound } from "@/components/preferences/member-not-found";
import { FoodPreferencesForm } from "@/components/preferences/food-form";
import { getCurrentMember } from "@/lib/server/current-member";
import { getMemberPreferences } from "@/lib/server/preferences";

export const metadata: Metadata = {
  title: "Food preferences · Sage Adventurer",
};

interface StepParams {
  params: Promise<{ id: string }>;
}

export default async function FoodPreferencesPage({ params }: StepParams) {
  const { id } = await params;
  const current = await getCurrentMember(id);
  if (!current) return <MemberNotFound />;

  const preferences = await getMemberPreferences(id, current.member.id);

  return (
    <WizardShell
      tripId={id}
      current="food"
      title="What do you want to eat?"
      description="Cuisines, dietary restrictions, and how much you want to spend per meal — restrictions apply to the whole group's picks."
    >
      <FoodPreferencesForm tripId={id} memberId={current.member.id} initial={preferences.food} />
    </WizardShell>
  );
}
