"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChipSelect, ChipRadio } from "@/components/ui/chip-group";
import { preferencesProvider } from "@/lib/providers/preferences";
import type { FoodPreferences } from "@/lib/server/preferences";
import { CUISINE_OPTIONS, DIETARY_OPTIONS, MEAL_BUDGET_OPTIONS } from "@/lib/data/preferences-options";

export function FoodPreferencesForm({
  tripId,
  memberId,
  initial,
}: {
  tripId: string;
  memberId: string;
  initial: FoodPreferences | null;
}) {
  const router = useRouter();

  const [cuisines, setCuisines] = useState<string[]>(initial?.cuisines ?? []);
  const [dietary, setDietary] = useState<string[]>(initial?.dietary ?? []);
  const [mealBudget, setMealBudget] = useState(initial?.meal_budget ?? "mid");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await preferencesProvider.save("food", {
      member_id: memberId,
      trip_id: tripId,
      cuisines,
      dietary,
      meal_budget: mealBudget,
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    router.push(`/trips/${tripId}/preferences/activities`);
    router.refresh();
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <ChipSelect
          label="Cuisines you're into"
          options={CUISINE_OPTIONS}
          value={cuisines}
          onChange={setCuisines}
          disabled={pending}
        />

        <ChipSelect
          label="Dietary restrictions"
          options={DIETARY_OPTIONS}
          value={dietary}
          onChange={setDietary}
          disabled={pending}
        />

        <ChipRadio
          label="Meal budget"
          options={MEAL_BUDGET_OPTIONS}
          value={mealBudget}
          onChange={setMealBudget}
          disabled={pending}
        />

        <p
          role="alert"
          aria-live="polite"
          className="min-h-[18px] text-[12.5px] leading-[18px] text-destructive"
        >
          {error}
        </p>

        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Saving…" : "Next: Activities →"}
        </Button>
      </form>
    </Card>
  );
}
