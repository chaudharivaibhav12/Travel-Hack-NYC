"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChipSelect, ChipRadio } from "@/components/ui/chip-group";
import { preferencesProvider } from "@/lib/providers/preferences";
import type { ActivitiesPreferences } from "@/lib/server/preferences";
import { INTEREST_OPTIONS, PACE_OPTIONS } from "@/lib/data/preferences-options";

export function ActivitiesPreferencesForm({
  tripId,
  memberId,
  initial,
}: {
  tripId: string;
  memberId: string;
  initial: ActivitiesPreferences | null;
}) {
  const router = useRouter();
  const mustSeesId = useId();

  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const [pace, setPace] = useState(initial?.pace ?? "moderate");
  const [mustSees, setMustSees] = useState(initial?.must_sees ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await preferencesProvider.save("activities", {
      member_id: memberId,
      trip_id: tripId,
      interests,
      pace,
      must_sees: mustSees.trim(),
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    // Last step — back to the trip page, now showing this member as done.
    router.push(`/trips/${tripId}`);
    router.refresh();
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <ChipSelect
          label="What are you into?"
          options={INTEREST_OPTIONS}
          value={interests}
          onChange={setInterests}
          disabled={pending}
        />

        <ChipRadio
          label="Pace"
          options={PACE_OPTIONS}
          value={pace}
          onChange={setPace}
          disabled={pending}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={mustSeesId}
            className="text-[12.5px] font-medium leading-[18px] text-foreground"
          >
            Anything you must see or do?
          </label>
          <textarea
            id={mustSeesId}
            rows={3}
            placeholder="teamLab, Shibuya crossing, ..."
            value={mustSees}
            onChange={(event) => setMustSees(event.target.value)}
            disabled={pending}
            className="w-full resize-none rounded-md border border-input bg-card px-3.5 py-2.5 text-[14.5px] leading-5 text-foreground placeholder:text-muted-foreground outline-none transition-[box-shadow,border-color] duration-[140ms] ease-out focus:border-transparent focus:ring-2 focus:ring-ring"
          />
        </div>

        <p
          role="alert"
          aria-live="polite"
          className="min-h-[18px] text-[12.5px] leading-[18px] text-destructive"
        >
          {error}
        </p>

        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Saving…" : "Finish"}
        </Button>
      </form>
    </Card>
  );
}
