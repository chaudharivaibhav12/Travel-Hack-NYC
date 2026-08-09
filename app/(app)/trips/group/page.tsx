"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, Lock, ClipboardList, Sparkles, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-context";
import { cn } from "@/lib/utils";
import { listGroupTripsRemote } from "@/lib/group/api";
import type { GroupTrip } from "@/lib/group/types";

const STATUS_META: Record<
  GroupTrip["status"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  setup: {
    label: "Setting up",
    color: "text-muted-foreground bg-muted",
    icon: <ClipboardList size={12} strokeWidth={1.5} />,
  },
  "survey-open": {
    label: "Survey open",
    color: "text-amber-700 bg-amber-50",
    icon: <ClipboardList size={12} strokeWidth={1.5} />,
  },
  generating: {
    label: "Generating plans",
    color: "text-primary bg-primary/10",
    icon: <Sparkles size={12} strokeWidth={1.5} />,
  },
  reviewing: {
    label: "Reviewing plans",
    color: "text-primary bg-primary/10",
    icon: <Sparkles size={12} strokeWidth={1.5} />,
  },
  locked: {
    label: "Plan locked",
    color: "text-emerald-700 bg-emerald-50",
    icon: <Lock size={12} strokeWidth={1.5} />,
  },
};

function GroupTripCard({
  trip,
  userEmail,
  surveyStatuses,
}: {
  trip: GroupTrip;
  userEmail: string;
  surveyStatuses: Record<string, string>;
}) {
  const meta = STATUS_META[trip.status];
  const isOrganizer = trip.organizerEmail === userEmail;
  const allEmails = [trip.organizerEmail, ...trip.invitedEmails];
  const completedCount = allEmails.filter((e) => surveyStatuses[e] === "complete").length;
  const memberCount = allEmails.length;

  const start = new Date(trip.checkin).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const end = new Date(trip.checkout).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const nights = Math.ceil(
    (new Date(trip.checkout).getTime() - new Date(trip.checkin).getTime()) / 86400000,
  );

  return (
    <Link
      href={`/trips/group/${trip.id}`}
      className={cn(
        "flex items-start gap-4 rounded-lg border border-border bg-card p-6 shadow-page",
        "outline-none transition-[transform,box-shadow] duration-[160ms] ease-out",
        "hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <span
        className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[13px] bg-accent text-foreground"
        aria-hidden="true"
      >
        <Users size={24} strokeWidth={1.5} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="block truncate font-display text-[17px] font-semibold leading-[22px] text-foreground">
            {trip.title}
          </span>
          {isOrganizer && (
            <span className="text-[11px] leading-none text-muted-foreground">(organizer)</span>
          )}
        </span>

        <span className="mt-1 block text-[13px] leading-[18px] text-muted-foreground">
          {trip.destination} · {start} – {end} · {nights} night{nights !== 1 ? "s" : ""}
        </span>

        <span className="mt-2.5 flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none",
              meta.color,
            )}
          >
            {meta.icon}
            {meta.label}
          </span>

          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            <CheckCircle2 size={13} strokeWidth={1.5} className="text-emerald-600" />
            {completedCount}/{memberCount} surveys done
          </span>
        </span>
      </span>
    </Link>
  );
}

export default function GroupTripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<GroupTrip[]>([]);
  const [allSurveyStatuses, setAllSurveyStatuses] = useState<Record<string, Record<string, string>>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!user?.email) return;
    listGroupTripsRemote(user.email)
      .then(({ trips: t, surveyStatuses }) => {
        setTrips(t);
        setAllSurveyStatuses(surveyStatuses);
      })
      .catch(console.error);
  }, [user?.email]);

  if (!mounted) return null;

  return (
    <div>
      <div className="mb-[34px] flex items-start justify-between gap-4">
        <PageHeader
          title="Group Trips"
          subtitle="Plan together. Every preference stays private until it becomes a shared plan."
        />
        <Link href="/trips/group/new" className="shrink-0 pt-1">
          <Button variant="primary">
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            New trip
          </Button>
        </Link>
      </div>

      {!user ? (
        <EmptyState
          icon={Users}
          title="Sign in to see your group trips"
          description="Group trips are tied to your account so only invited members can access them."
          action={{ label: "Sign in", href: "/login" }}
        />
      ) : trips.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No group trips yet"
          description="Create a trip, add friends by email, and GroupWeave will build a plan that works for everyone — without anyone seeing each other's private preferences."
          action={{ label: "Create your first group trip", href: "/trips/group/new" }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {trips.map((trip) => (
            <GroupTripCard
              key={trip.id}
              trip={trip}
              userEmail={user.email}
              surveyStatuses={allSurveyStatuses[trip.id] ?? {}}
            />
          ))}

          <Card className="p-5">
            <p className="text-[12.5px] leading-[18px] text-muted-foreground">
              <span className="font-medium text-foreground">How it works:</span>{" "}
              Each traveler fills in a private 2-minute survey. GroupWeave generates three plans
              that satisfy everyone&rsquo;s hard constraints. You vote, pick one, and lock it.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
