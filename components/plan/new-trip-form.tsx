"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import { tripsProvider } from "@/lib/providers/trips";

/**
 * Reuses the AuthCard's Field + Button recipe (DESIGN.md §7) — this screen's
 * only job is collecting enough to create a real trip row. Per-member
 * preferences (budget, vibe, food, activities) are a later screen once the
 * trip exists and has a shareable link.
 */
export function NewTripForm() {
  const { user } = useAuth();
  const router = useRouter();

  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!user) {
      setError("Sign in again to create a trip.");
      return;
    }
    if (checkout < checkin) {
      setError("Check out date can't be before check in.");
      return;
    }

    setPending(true);
    const result = await tripsProvider.createTrip({
      eventName,
      eventLocation,
      checkin,
      checkout,
      userId: user.id,
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    // Trip now exists — it shows up on /trips (My Trips), which is where
    // the trip's own page reads live data instead of the old static preview.
    router.push("/trips");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label="Trip name"
          name="eventName"
          placeholder="Kazbegi Roadtrip"
          value={eventName}
          onChange={(event) => setEventName(event.target.value)}
          disabled={pending}
          required
        />

        <Field
          label="Destination"
          name="eventLocation"
          placeholder="Kazbegi, Georgia"
          value={eventLocation}
          onChange={(event) => setEventLocation(event.target.value)}
          disabled={pending}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Check in"
            name="checkin"
            type="date"
            value={checkin}
            onChange={(event) => setCheckin(event.target.value)}
            disabled={pending}
            required
          />
          <Field
            label="Check out"
            name="checkout"
            type="date"
            value={checkout}
            onChange={(event) => setCheckout(event.target.value)}
            disabled={pending}
            required
          />
        </div>

        {/* Reserved height so the card never jumps when an error appears. */}
        <p
          role="alert"
          aria-live="polite"
          className="min-h-[18px] text-[12.5px] leading-[18px] text-destructive"
        >
          {error}
        </p>

        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Creating trip…" : "Create trip"}
        </Button>
      </form>
    </Card>
  );
}
