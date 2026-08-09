"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-group";
import { preferencesProvider } from "@/lib/providers/preferences";
import type { StayPreferences } from "@/lib/server/preferences";

const PROPERTY_TYPE_OPTIONS = [
  { value: "hotel", label: "Hotel" },
  { value: "apartment", label: "Apartment" },
  { value: "hostel", label: "Hostel" },
  { value: "villa", label: "Villa" },
  { value: "cabin", label: "Cabin" },
];

const VIBE_OPTIONS = [
  { value: "modern", label: "Modern" },
  { value: "cozy", label: "Cozy" },
  { value: "boutique", label: "Boutique" },
  { value: "budget", label: "Budget" },
  { value: "luxury", label: "Luxury" },
];

const NEEDS_OPTIONS = [
  { value: "private_room", label: "Private room" },
  { value: "free_cancellation", label: "Free cancellation" },
  { value: "near_transit", label: "Near transit" },
  { value: "good_reviews", label: "Good reviews" },
];

export function StayPreferencesForm({
  tripId,
  memberId,
  initial,
}: {
  tripId: string;
  memberId: string;
  initial: StayPreferences | null;
}) {
  const router = useRouter();

  const [budgetMin, setBudgetMin] = useState(initial?.budget_min != null ? String(initial.budget_min) : "");
  const [budgetMax, setBudgetMax] = useState(initial?.budget_max != null ? String(initial.budget_max) : "");
  const [propertyTypes, setPropertyTypes] = useState<string[]>(initial?.property_types ?? []);
  const [vibes, setVibes] = useState<string[]>(initial?.vibes ?? []);
  const [needs, setNeeds] = useState<string[]>(initial?.needs ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!budgetMin || Number(budgetMin) < 0) return setError("Enter a minimum nightly budget.");
    if (!budgetMax || Number(budgetMax) <= 0) return setError("Enter a maximum nightly budget.");
    if (Number(budgetMax) < Number(budgetMin)) return setError("Max budget can't be below min budget.");

    setPending(true);
    const result = await preferencesProvider.save("stay", {
      member_id: memberId,
      trip_id: tripId,
      budget_min: Number(budgetMin),
      budget_max: Number(budgetMax),
      property_types: propertyTypes,
      vibes,
      needs,
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    router.push(`/trips/${tripId}/preferences/food`);
    router.refresh();
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Min per night (USD)"
            type="number"
            min={0}
            placeholder="50"
            value={budgetMin}
            onChange={(event) => setBudgetMin(event.target.value)}
            disabled={pending}
            required
          />
          <Field
            label="Max per night (USD)"
            type="number"
            min={0}
            placeholder="150"
            value={budgetMax}
            onChange={(event) => setBudgetMax(event.target.value)}
            disabled={pending}
            required
          />
        </div>

        <ChipSelect
          label="Property types"
          options={PROPERTY_TYPE_OPTIONS}
          value={propertyTypes}
          onChange={setPropertyTypes}
          disabled={pending}
        />

        <ChipSelect
          label="Vibe"
          options={VIBE_OPTIONS}
          value={vibes}
          onChange={setVibes}
          disabled={pending}
        />

        <ChipSelect
          label="Must-haves"
          options={NEEDS_OPTIONS}
          value={needs}
          onChange={setNeeds}
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
          {pending ? "Saving…" : "Next: Food →"}
        </Button>
      </form>
    </Card>
  );
}
