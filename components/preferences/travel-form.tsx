"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChipRadio } from "@/components/ui/chip-group";
import { preferencesProvider } from "@/lib/providers/preferences";
import type { TravelPreferences } from "@/lib/server/preferences";

const DEPARTURE_TIME_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

const FLEXIBILITY_OPTIONS = [
  { value: "exact", label: "Exact dates" },
  { value: "1day", label: "±1 day" },
  { value: "3days", label: "±3 days" },
  { value: "flexible", label: "Flexible" },
];

export function TravelPreferencesForm({
  tripId,
  memberId,
  defaultDepartureDate,
  defaultReturnDate,
  initial,
}: {
  tripId: string;
  memberId: string;
  /** Trip's own check-in/out, used when this member hasn't set their own dates yet. */
  defaultDepartureDate: string;
  defaultReturnDate: string;
  initial: TravelPreferences | null;
}) {
  const router = useRouter();

  const [originCity, setOriginCity] = useState(initial?.origin_city ?? "");
  const [originAirport, setOriginAirport] = useState(initial?.origin_airport ?? "");
  const [departureDate, setDepartureDate] = useState(initial?.departure_date ?? defaultDepartureDate);
  const [returnDate, setReturnDate] = useState(initial?.return_date ?? defaultReturnDate);
  const [flightBudget, setFlightBudget] = useState(
    initial?.flight_budget != null ? String(initial.flight_budget) : "",
  );
  const [departureTimePref, setDepartureTimePref] = useState(initial?.departure_time_pref ?? "any");
  const [dateFlexibility, setDateFlexibility] = useState(initial?.date_flexibility ?? "flexible");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!originCity.trim()) return setError("Enter your departure city.");
    if (!originAirport.trim()) return setError("Enter your departure airport code.");
    if (!flightBudget || Number(flightBudget) <= 0) return setError("Enter a flight budget.");
    if (returnDate < departureDate) return setError("Return date can't be before departure.");

    setPending(true);
    const result = await preferencesProvider.save("travel", {
      member_id: memberId,
      trip_id: tripId,
      origin_city: originCity.trim(),
      origin_airport: originAirport.trim().toUpperCase(),
      departure_date: departureDate,
      return_date: returnDate,
      flight_budget: Number(flightBudget),
      departure_time_pref: departureTimePref,
      date_flexibility: dateFlexibility,
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    router.push(`/trips/${tripId}/preferences/stay`);
    router.refresh();
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Departure city"
          placeholder="New York"
          value={originCity}
          onChange={(event) => setOriginCity(event.target.value)}
          disabled={pending}
          required
        />

        <Field
          label="Departure airport"
          placeholder="JFK"
          maxLength={3}
          value={originAirport}
          onChange={(event) => setOriginAirport(event.target.value.toUpperCase())}
          disabled={pending}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Depart"
            type="date"
            value={departureDate}
            onChange={(event) => setDepartureDate(event.target.value)}
            disabled={pending}
            required
          />
          <Field
            label="Return"
            type="date"
            value={returnDate}
            onChange={(event) => setReturnDate(event.target.value)}
            disabled={pending}
            required
          />
        </div>

        <Field
          label="Flight budget (USD)"
          type="number"
          min={1}
          placeholder="500"
          value={flightBudget}
          onChange={(event) => setFlightBudget(event.target.value)}
          disabled={pending}
          required
        />

        <ChipRadio
          label="Preferred departure time"
          options={DEPARTURE_TIME_OPTIONS}
          value={departureTimePref}
          onChange={setDepartureTimePref}
          disabled={pending}
        />

        <ChipRadio
          label="Date flexibility"
          options={FLEXIBILITY_OPTIONS}
          value={dateFlexibility}
          onChange={setDateFlexibility}
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
          {pending ? "Saving…" : "Next: Stay →"}
        </Button>
      </form>
    </Card>
  );
}
