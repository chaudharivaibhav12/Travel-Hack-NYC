"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Check,
  ChevronRight,
  Loader2,
  Users,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-context";
import {
  getTrip,
  getSurveyStatuses,
  getAllSurveysForTrip,
  getInbox,
  getPlans,
  savePlans,
  getSurvey,
  updateTrip,
} from "@/lib/group/store";
import { generatePlans, buildOverlayForUser } from "@/lib/group/planning-engine";
import { cn } from "@/lib/utils";
import type { GroupTrip, GeneratedPlan } from "@/lib/group/types";

const PLAN_META: Record<string, { color: string; bg: string; border: string }> = {
  consensus: { color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
  balanced: { color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  "best-value": { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const GENERATING_STEPS = [
  "Checking arrival and departure windows…",
  "Applying hard budget limits…",
  "Scoring must-haves and would-loves…",
  "Checking dietary and accessibility requirements…",
  "Building split blocks for diverging preferences…",
  "Computing fairness receipts…",
  "Generating personalized overlays…",
  "Finalizing three plan options…",
];

function PlanCard({ plan, tripId }: { plan: GeneratedPlan; tripId: string }) {
  const meta = PLAN_META[plan.type];
  return (
    <Link
      href={`/trips/group/${tripId}/plans/${plan.id}`}
      className={cn(
        "flex flex-col rounded-lg border p-6 shadow-page transition-[transform,box-shadow] duration-[160ms] ease-out hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        meta.bg,
        meta.border,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={cn("text-[11.5px] font-semibold uppercase tracking-wide", meta.color)}>
            {plan.type === "consensus" ? "Consensus" : plan.type === "balanced" ? "Balanced" : "Best Value"}
          </span>
          <h3 className="mt-0.5 font-display text-[19px] font-semibold leading-[24px] text-foreground">
            {plan.title}
          </h3>
        </div>
        <ChevronRight size={18} strokeWidth={1.5} className="mt-1 shrink-0 text-muted-foreground" />
      </div>

      <p className="mt-2 text-[13px] leading-[18px] text-muted-foreground">{plan.tagline}</p>

      {/* Cost range */}
      <div className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-foreground">
        <DollarSign size={14} strokeWidth={1.5} className="text-muted-foreground" />
        ${plan.costRange.min}–${plan.costRange.max} per person (est.)
      </div>

      {/* Day strip */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {plan.days.map((day) => (
          <div
            key={day.day}
            className="shrink-0 rounded-md border border-border/60 bg-card/80 px-2.5 py-2 text-center"
          >
            <div className="text-[11px] font-semibold text-muted-foreground">{day.date}</div>
            <div className="mt-0.5 text-[11.5px] text-foreground">
              {day.activities[0]?.title.split(" ").slice(0, 3).join(" ")}&hellip;
            </div>
          </div>
        ))}
      </div>

      {/* Fairness preview */}
      <ul className="mt-4 flex flex-col gap-1">
        {plan.fairnessReceipt.slice(0, 2).map((item) => (
          <li key={item} className="flex items-start gap-2 text-[12px] leading-[16px] text-foreground/80">
            <Check size={12} strokeWidth={2.5} className={cn("mt-0.5 shrink-0", meta.color)} />
            {item}
          </li>
        ))}
      </ul>

      {plan.conflicts.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertCircle size={13} strokeWidth={1.5} className="text-amber-600" />
          <span className="text-[12px] text-amber-700">Has tradeoffs — open Compromise Studio for options</span>
        </div>
      )}

      {plan.status === "locked" && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <Check size={13} strokeWidth={2} className="text-emerald-700" />
          <span className="text-[12px] font-medium text-emerald-700">Locked plan</span>
        </div>
      )}
    </Link>
  );
}

export default function PlansPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [trip, setTrip] = useState<GroupTrip | null>(null);
  const [plans, setPlans] = useState<GeneratedPlan[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    const t = getTrip(tripId);
    if (!t) { router.replace("/trips/group"); return; }
    setTrip(t);
    setStatuses(getSurveyStatuses(tripId));
    setPlans(getPlans(tripId));
  }, [tripId, router]);

  if (!mounted || !trip || !user) return null;

  const isOrganizer = trip.organizerEmail === user.email;
  const allEmails = [trip.organizerEmail, ...trip.invitedEmails];
  const completedCount = allEmails.filter((e) => statuses[e] === "complete").length;
  const hasPlan = plans.length > 0;
  const canGenerate = isOrganizer && completedCount >= Math.max(1, Math.ceil(allEmails.length / 2));

  const handleGenerate = async () => {
    if (!isOrganizer) return;
    setGenerating(true);
    setGenStep(0);

    for (let i = 0; i < GENERATING_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 350));
      setGenStep(i + 1);
    }

    const surveys = getAllSurveysForTrip(trip);
    const inboxItems = getInbox(tripId);
    const generated = generatePlans(trip, surveys, inboxItems);

    // Build private overlays for the current user
    const mySurvey = getSurvey(tripId, user.email);
    for (const plan of generated) {
      if (mySurvey) {
        plan.privateOverlays[user.email] = buildOverlayForUser(mySurvey, plan);
      }
      // Seed demo overlays for other members so the demo reads well
      for (const email of allEmails) {
        if (email !== user.email && !plan.privateOverlays[email]) {
          plan.privateOverlays[email] = [
            "Estimated spend fits their submitted budget range",
            "Activities align with their top interests",
            "Schedule respects their preferred start time",
          ];
        }
      }
    }

    savePlans(tripId, generated);
    updateTrip(tripId, { status: "reviewing" });
    setTrip({ ...trip, status: "reviewing" });
    setPlans(generated);
    setGenerating(false);
    setGenStep(0);
  };

  return (
    <div>
      <div className="mb-5">
        <Link
          href={`/trips/group/${tripId}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors duration-[140ms]"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          {trip.title}
        </Link>
      </div>

      <PageHeader
        title="Trip Plans"
        subtitle="Three options generated from everyone's preferences — consensus, balanced, and best value."
      />

      {/* Generating state (E1) */}
      {generating && (
        <Card className="p-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles size={24} strokeWidth={1.5} className="text-primary" />
            </div>
            <div>
              <h2 className="font-display text-[19px] font-semibold text-foreground">
                Building your plans
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Applying constraints and scoring preferences — no black-box AI here.
              </p>
            </div>
            <div className="w-full max-w-sm">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${(genStep / GENERATING_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 text-left w-full max-w-sm">
              {GENERATING_STEPS.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "flex items-center gap-2.5 text-[12.5px] transition-opacity duration-200",
                    i < genStep ? "text-foreground" : "text-muted-foreground/40",
                  )}
                >
                  {i < genStep ? (
                    <Check size={13} strokeWidth={2.5} className="shrink-0 text-primary" />
                  ) : i === genStep ? (
                    <Loader2 size={13} strokeWidth={1.5} className="shrink-0 animate-spin text-primary" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {s}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* No plans yet */}
      {!generating && !hasPlan && (
        <div className="flex flex-col gap-5">
          {/* Survey progress reminder */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Users size={18} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[13.5px] font-medium text-foreground">
                  {completedCount} of {allEmails.length} survey{allEmails.length !== 1 ? "s" : ""} complete
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {canGenerate
                    ? "You have enough responses to generate plans."
                    : `Need at least ${Math.ceil(allEmails.length / 2)} to generate.`}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${(completedCount / allEmails.length) * 100}%` }}
              />
            </div>
          </Card>

          {isOrganizer ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card px-6 py-12 text-center shadow-page">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Sparkles size={24} strokeWidth={1.5} className="text-primary" />
              </div>
              <div>
                <h2 className="font-display text-[19px] font-semibold text-foreground">Ready to generate plans?</h2>
                <p className="mt-2 max-w-[44ch] text-[13px] text-muted-foreground">
                  GroupWeave will build three distinct plans from everyone&rsquo;s responses. Constraint scoring is transparent and deterministic.
                </p>
              </div>
              {!canGenerate && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5">
                  <AlertCircle size={14} strokeWidth={1.5} className="text-amber-600" />
                  <span className="text-[12.5px] text-amber-700">
                    Waiting for more surveys. You can generate now but the plan may not reflect all preferences.
                  </span>
                </div>
              )}
              <Button variant="primary" onClick={() => void handleGenerate()}>
                <Sparkles size={15} strokeWidth={1.5} />
                Generate three plans
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card px-6 py-12 text-center shadow-page">
              <Sparkles size={24} strokeWidth={1.5} className="text-muted-foreground" />
              <p className="font-display text-[17px] font-semibold text-foreground">Plans not generated yet</p>
              <p className="max-w-[40ch] text-[13px] text-muted-foreground">
                The organizer will generate plans once enough surveys are complete.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Plans overview (E2) */}
      {!generating && hasPlan && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-muted-foreground">
              Tap a plan to see the day-by-day itinerary, fairness receipt, and give your private feedback.
            </p>
            {isOrganizer && (
              <Button variant="secondary" onClick={() => void handleGenerate()}>
                <Sparkles size={14} strokeWidth={1.5} />
                Regenerate
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} tripId={tripId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
