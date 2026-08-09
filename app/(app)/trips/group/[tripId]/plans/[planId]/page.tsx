"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Lock,
  MapPin,
  Users,
  Eye,
  EyeOff,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Star,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-context";
import {
  getTrip,
  getPlan,
  updatePlan,
  updateTrip,
  getSurvey,
  getMyFeedback,
  saveFeedback,
  getAggregateFeedback,
} from "@/lib/group/store";
import { buildOverlayForUser } from "@/lib/group/planning-engine";
import { cn } from "@/lib/utils";
import type {
  GroupTrip,
  GeneratedPlan,
  PlanDay,
  PlanActivity,
  SplitBlock,
  FeedbackChoice,
  CompromiseOption,
} from "@/lib/group/types";

// ─── Status badges ────────────────────────────────────────────────────────────

const ACTIVITY_STATUS: Record<PlanActivity["status"], { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  estimated: { label: "Estimated", color: "text-blue-700 bg-blue-50 border-blue-200" },
  "needs-booking": { label: "Needs booking", color: "text-amber-700 bg-amber-50 border-amber-200" },
  "weather-sensitive": { label: "Weather-sensitive", color: "text-purple-700 bg-purple-50 border-purple-200" },
};

// ─── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({ activity }: { activity: PlanActivity }) {
  const badge = ACTIVITY_STATUS[activity.status];
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-accent text-foreground",
          !activity.isShared && "opacity-70",
        )}
      >
        <MapPin size={15} strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="block text-[13.5px] font-medium leading-[18px] text-foreground">
            {activity.title}
          </span>
          {!activity.isShared && (
            <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10.5px] font-medium text-purple-700">
              Split group
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[12px] leading-[16px] text-muted-foreground">
          {activity.time} · {activity.kind}
          {activity.estimatedCost && ` · ${activity.estimatedCost}`}
        </span>
        <span
          className={cn(
            "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
            badge.color,
          )}
        >
          {badge.label}
        </span>
      </span>
    </li>
  );
}

// ─── Split block card ─────────────────────────────────────────────────────────

function SplitBlockCard({ block }: { block: SplitBlock }) {
  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users size={14} strokeWidth={1.5} className="text-purple-700" />
        <span className="text-[12.5px] font-semibold text-purple-800">
          Split block · {block.startTime}–{block.endTime}
        </span>
      </div>
      <p className="mb-3 text-[12px] italic text-purple-700">"{block.reason}"</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-purple-200 bg-white/60 p-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-purple-700">{block.groupALabel}</p>
          <p className="mt-1 text-[12.5px] text-foreground">{block.groupAActivity}</p>
        </div>
        <div className="rounded-md border border-purple-200 bg-white/60 p-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-purple-700">{block.groupBLabel}</p>
          <p className="mt-1 text-[12.5px] text-foreground">{block.groupBActivity}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-purple-700">
        <CheckCircle2 size={13} strokeWidth={1.5} />
        Reunite at {block.reunionTime} · {block.reunionLocation}
      </div>
    </div>
  );
}

// ─── Day card ─────────────────────────────────────────────────────────────────

function DayCard({ day }: { day: PlanDay }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-[17px] font-semibold leading-[22px] text-foreground">
          Day {day.day} · {day.place}
        </h3>
        <span className="text-[13px] text-muted-foreground">{day.date}</span>
      </div>

      {day.splitBlocks.length > 0 && (
        <div className="mb-4 flex flex-col gap-3">
          {day.splitBlocks.map((block, i) => (
            <SplitBlockCard key={i} block={block} />
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {day.activities.map((activity, i) => (
          <ActivityRow key={`${day.day}-${i}`} activity={activity} />
        ))}
      </ul>
    </Card>
  );
}

// ─── Fairness receipt ─────────────────────────────────────────────────────────

function FairnessReceipt({ items }: { items: string[] }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <Card className="p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setExpanded((v) => !v)}
      >
        <h2 className="font-display text-[15px] font-semibold leading-[20px] text-foreground">
          Why this plan works
        </h2>
        {expanded ? <ChevronUp size={16} strokeWidth={1.5} /> : <ChevronDown size={16} strokeWidth={1.5} />}
      </button>
      {expanded && (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[13px] leading-[18px] text-foreground">
              <Check size={13} strokeWidth={2.5} className="mt-0.5 shrink-0 text-primary" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── Private overlay ──────────────────────────────────────────────────────────

function PrivateOverlay({ reasons }: { reasons: string[] }) {
  const [visible, setVisible] = useState(false);
  return (
    <Card
      className={cn(
        "p-5 border-2",
        visible ? "border-primary/30 bg-primary/5" : "border-border",
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setVisible((v) => !v)}
      >
        <span className="flex items-center gap-2">
          {visible ? <Eye size={15} strokeWidth={1.5} className="text-primary" /> : <EyeOff size={15} strokeWidth={1.5} />}
          <h2 className="font-display text-[15px] font-semibold leading-[20px] text-foreground">
            Why this works for you
          </h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-medium text-primary">
            Only you can see this
          </span>
        </span>
        {visible ? <ChevronUp size={16} strokeWidth={1.5} /> : <ChevronDown size={16} strokeWidth={1.5} />}
      </button>

      {visible && (
        <ul className="mt-3 flex flex-col gap-2">
          {reasons.length > 0 ? reasons.map((r) => (
            <li key={r} className="flex items-start gap-2.5 text-[13px] leading-[18px] text-foreground">
              <Star size={13} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" />
              {r}
            </li>
          )) : (
            <p className="text-[13px] text-muted-foreground">
              Complete the private survey to see your personalized overlay for this plan.
            </p>
          )}
        </ul>
      )}
    </Card>
  );
}

// ─── Feedback form (E6) ───────────────────────────────────────────────────────

function FeedbackSection({
  tripId,
  planId,
  userEmail,
  onSubmit,
}: {
  tripId: string;
  planId: string;
  userEmail: string;
  onSubmit: () => void;
}) {
  const existing = getMyFeedback(tripId, userEmail)[planId];
  const [choice, setChoice] = useState<FeedbackChoice | null>(existing?.choice ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [saved, setSaved] = useState(!!existing);

  const handleSubmit = () => {
    if (!choice) return;
    saveFeedback(tripId, userEmail, planId, {
      tripId, planId, choice, note, submittedAt: new Date().toISOString(),
    });
    setSaved(true);
    onSubmit();
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={15} strokeWidth={1.5} className="text-muted-foreground" />
        <h2 className="font-display text-[15px] font-semibold leading-[20px] text-foreground">
          Your private feedback
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground">
          Only you and aggregates go to the organizer
        </span>
      </div>

      {saved && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <CheckCircle2 size={13} strokeWidth={1.5} className="text-emerald-700" />
          <span className="text-[12.5px] text-emerald-700">Feedback saved. You can update it any time.</span>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {([
          { value: "happy", label: "Happy with this plan" },
          { value: "acceptable", label: "Acceptable with a small change" },
          { value: "breaks-must-have", label: "This breaks a must-have for me" },
        ] as { value: FeedbackChoice; label: string }[]).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setChoice(opt.value); setSaved(false); }}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-[13.5px] font-medium transition-colors duration-[140ms]",
              choice === opt.value
                ? opt.value === "breaks-must-have"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-primary bg-primary/5 text-primary"
                : "border-border bg-card text-foreground hover:bg-accent/60",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                choice === opt.value
                  ? "border-current bg-current"
                  : "border-muted-foreground",
              )}
            >
              {choice === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            {opt.label}
          </button>
        ))}
      </div>

      {(choice === "acceptable" || choice === "breaks-must-have") && (
        <div className="mb-4">
          <Field
            label="Optional note"
            placeholder="What would you change or what must-have is affected?"
            value={note}
            onChange={(e) => { setNote(e.target.value); setSaved(false); }}
          />
        </div>
      )}

      <Button variant="primary" onClick={handleSubmit} disabled={!choice}>
        {saved ? "Update feedback" : "Submit feedback"}
      </Button>
    </Card>
  );
}

// ─── Organizer aggregate results (E7) ─────────────────────────────────────────

function AggregateResults({
  tripId,
  planId,
  allEmails,
}: {
  tripId: string;
  planId: string;
  allEmails: string[];
}) {
  const agg = getAggregateFeedback(tripId, allEmails, planId);
  const total = agg.happy + agg.acceptable + agg.breaksMustHave;
  if (total === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="mb-3 font-display text-[15px] font-semibold leading-[20px] text-foreground">
        Group feedback (aggregate only)
      </h2>
      <div className="flex flex-col gap-2">
        {[
          { label: "Happy with this plan", count: agg.happy, color: "bg-emerald-500" },
          { label: "Acceptable with a small change", count: agg.acceptable, color: "bg-amber-400" },
          { label: "Breaks a must-have", count: agg.breaksMustHave, color: "bg-red-400" },
        ].map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12.5px] text-foreground">{label}</span>
                <span className="text-[12.5px] font-semibold text-foreground">{count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-500", color)}
                  style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">
        {total} of {allEmails.length} traveler{allEmails.length !== 1 ? "s" : ""} have responded.
        Individual responses are never attributed.
      </p>
    </Card>
  );
}

// ─── Compromise Studio (E8) ───────────────────────────────────────────────────

function CompromiseStudio({
  conflicts,
  options,
  onSelect,
}: {
  conflicts: string[];
  options: CompromiseOption[];
  onSelect: (opt: CompromiseOption) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  if (conflicts.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50 p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <AlertTriangle size={15} strokeWidth={1.5} className="text-amber-700" />
          <h2 className="font-display text-[15px] font-semibold leading-[20px] text-amber-900">
            Compromise Studio
          </h2>
        </span>
        {expanded ? <ChevronUp size={16} strokeWidth={1.5} className="text-amber-700" /> : <ChevronDown size={16} strokeWidth={1.5} className="text-amber-700" />}
      </button>

      {expanded && (
        <div className="mt-3">
          <div className="mb-3 rounded-md border border-amber-200 bg-white/60 px-3.5 py-3">
            {conflicts.map((c) => (
              <p key={c} className="text-[13px] text-amber-800">{c}</p>
            ))}
            <p className="mt-1 text-[12px] text-amber-700">
              <em>Note: individual budget or preference constraints are never named here.</em>
            </p>
          </div>

          <p className="mb-2.5 text-[12.5px] font-medium text-amber-900">Choose a tradeoff to regenerate the plan:</p>
          <div className="flex flex-col gap-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt)}
                className="flex items-start gap-3 rounded-md border border-amber-200 bg-white/70 px-4 py-3 text-left hover:bg-amber-100 transition-colors duration-[140ms]"
              >
                <ArrowRight size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-amber-700" />
                <span>
                  <span className="block text-[13.5px] font-medium text-amber-900">{opt.description}</span>
                  <span className="block text-[12px] text-amber-700">{opt.consequence}</span>
                  {opt.costImpact && (
                    <span className="mt-0.5 block text-[11.5px] font-semibold text-amber-800">{opt.costImpact}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Stay22 Accommodation section (F2) ────────────────────────────────────────

const DEMO_ACCOMMODATIONS = [
  {
    id: "acc-1", name: "Lower East Side Boutique Hotel", neighborhood: "Lower East Side",
    pricePerNight: 189, fitLabel: "Best location",
    rationale: "12-minute average trip from your planned activities and reduces late-night travel",
    bookingUrl: "#",
  },
  {
    id: "acc-2", name: "Budget Hostel — Private Room", neighborhood: "East Village",
    pricePerNight: 89, fitLabel: "Best value",
    rationale: "Lowest cost option within 20 minutes of all major itinerary locations",
    bookingUrl: "#",
  },
  {
    id: "acc-3", name: "SoHo Design Hotel", neighborhood: "SoHo",
    pricePerNight: 299, fitLabel: "Best comfort",
    rationale: "Premium experience with concierge, ideal for the group that prioritized accommodation",
    bookingUrl: "#",
  },
] as const;

function AccommodationSection({ trip }: { trip: GroupTrip }) {
  const nights = Math.ceil(
    (new Date(trip.checkout).getTime() - new Date(trip.checkin).getTime()) / 86400000,
  );
  return (
    <Card className="p-5">
      <h2 className="mb-1 font-display text-[17px] font-semibold leading-[22px] text-foreground">
        Accommodation
      </h2>
      <p className="mb-4 text-[12.5px] text-muted-foreground">
        Recommended home base for {trip.destination} · {nights} night{nights !== 1 ? "s" : ""} · via Stay22
      </p>
      <div className="flex flex-col gap-3">
        {DEMO_ACCOMMODATIONS.map((acc) => {
          const total = acc.pricePerNight * nights;
          const fitColors: Record<string, string> = {
            "Best location": "text-blue-700 bg-blue-50 border-blue-200",
            "Best value": "text-emerald-700 bg-emerald-50 border-emerald-200",
            "Best comfort": "text-purple-700 bg-purple-50 border-purple-200",
          };
          return (
            <div key={acc.id} className="rounded-lg border border-border bg-card p-4 shadow-page">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-[14px] font-semibold text-foreground">{acc.name}</h3>
                  <p className="text-[12px] text-muted-foreground">{acc.neighborhood}</p>
                </div>
                <span className={cn("rounded-full border px-2.5 py-1 text-[11.5px] font-medium", fitColors[acc.fitLabel])}>
                  {acc.fitLabel}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">{acc.rationale}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[15px] font-semibold text-foreground">
                  ${acc.pricePerNight}/night
                  <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">(${total} total)</span>
                </span>
                <a
                  href={acc.bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-[12.5px] font-semibold hover:bg-accent hover:text-accent-foreground transition-colors duration-[140ms]"
                >
                  Book via Stay22
                  <ExternalLink size={12} strokeWidth={1.5} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanDetailPage() {
  const { tripId, planId } = useParams<{ tripId: string; planId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [trip, setTrip] = useState<GroupTrip | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [mounted, setMounted] = useState(false);
  const [locking, setLocking] = useState(false);
  const [feedbackRefresh, setFeedbackRefresh] = useState(0);
  const [compromiseApplied, setCompromiseApplied] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const t = getTrip(tripId);
    if (!t) { router.replace("/trips/group"); return; }
    setTrip(t);

    const p = getPlan(tripId, planId);
    if (!p) { router.replace(`/trips/group/${tripId}/plans`); return; }

    // Ensure current user's private overlay is built
    if (user?.email) {
      const survey = getSurvey(tripId, user.email);
      if (survey && !p.privateOverlays[user.email]) {
        const reasons = buildOverlayForUser(survey, p);
        updatePlan(tripId, planId, {
          privateOverlays: { ...p.privateOverlays, [user.email]: reasons },
        });
        p.privateOverlays[user.email] = reasons;
      }
    }

    setPlan(p);
  }, [tripId, planId, user?.email, router]);

  if (!mounted || !plan || !trip || !user) return null;

  const isOrganizer = trip.organizerEmail === user.email;
  const isLocked = plan.status === "locked";
  const allEmails = [trip.organizerEmail, ...trip.invitedEmails];
  const myOverlay = plan.privateOverlays[user.email] ?? [];

  const PLAN_TYPE_LABELS: Record<string, string> = {
    consensus: "Consensus Plan",
    balanced: "Balanced Plan",
    "best-value": "Best-Value Plan",
  };

  const handleLock = async () => {
    if (!isOrganizer || isLocked) return;
    setLocking(true);
    await new Promise((r) => setTimeout(r, 600));
    updatePlan(tripId, planId, { status: "locked", lockedAt: new Date().toISOString() });
    updateTrip(tripId, { status: "locked", lockedPlanId: planId });
    setPlan((prev) => prev ? { ...prev, status: "locked" } : prev);
    setTrip((prev) => prev ? { ...prev, status: "locked", lockedPlanId: planId } : prev);
    setLocking(false);
  };

  const handleCompromise = async (opt: CompromiseOption) => {
    setCompromiseApplied(opt.description);
    await new Promise((r) => setTimeout(r, 1000));
    // In production: re-run planning engine with modified constraint.
    // For demo: just acknowledge the selection.
  };

  const handleUnlock = () => {
    updatePlan(tripId, planId, { status: "draft", lockedAt: undefined });
    updateTrip(tripId, { status: "reviewing", lockedPlanId: undefined });
    setPlan((prev) => prev ? { ...prev, status: "draft" } : prev);
    setTrip((prev) => prev ? { ...prev, status: "reviewing", lockedPlanId: undefined } : prev);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Link href="/trips/group" className="hover:text-foreground transition-colors duration-[140ms]">
          Group Trips
        </Link>
        <span>/</span>
        <Link href={`/trips/group/${tripId}`} className="hover:text-foreground transition-colors duration-[140ms]">
          {trip.title}
        </Link>
        <span>/</span>
        <Link href={`/trips/group/${tripId}/plans`} className="hover:text-foreground transition-colors duration-[140ms]">
          Plans
        </Link>
        <span>/</span>
        <span className="text-foreground">{plan.title}</span>
      </div>

      {/* Header */}
      <div className="mb-[34px] flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            {PLAN_TYPE_LABELS[plan.type]}
          </span>
          <h1 className="font-display text-[26px] font-medium leading-8 tracking-[-0.2px] text-foreground">
            {plan.title}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{plan.tagline}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {isLocked && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-[12.5px] font-semibold text-emerald-700">
              <Lock size={12} strokeWidth={2} />
              Locked
            </span>
          )}
          {isOrganizer && !isLocked && (
            <Button variant="primary" onClick={() => void handleLock()} disabled={locking}>
              {locking ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> : <Lock size={14} strokeWidth={1.5} />}
              {locking ? "Locking…" : "Lock this plan"}
            </Button>
          )}
          {isOrganizer && isLocked && (
            <Button variant="ghost" onClick={handleUnlock}>
              <RotateCcw size={14} strokeWidth={1.5} />
              Unlock
            </Button>
          )}
        </div>
      </div>

      {/* Lock confirmation banner */}
      {isLocked && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 size={18} strokeWidth={1.5} className="shrink-0 text-emerald-700" />
          <div>
            <p className="text-[13.5px] font-semibold text-emerald-800">This is the group&rsquo;s active plan.</p>
            <p className="text-[12px] text-emerald-700">A version snapshot has been saved. Use the change event simulator on the dashboard if plans need to adapt.</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Main: itinerary */}
        <div className="flex flex-col gap-5">
          {/* E3: Day timeline */}
          <section>
            <h2 className="mb-3 font-display text-[17px] font-semibold leading-[22px] text-foreground">
              Day by day
            </h2>
            <div className="flex flex-col gap-4">
              {plan.days.map((day) => (
                <DayCard key={day.day} day={day} />
              ))}
            </div>
          </section>

          {/* E4: Fairness Receipt */}
          <FairnessReceipt items={plan.fairnessReceipt} />

          {/* E5: Private overlay (only for the logged-in user) */}
          <PrivateOverlay reasons={myOverlay} />

          {/* E6: Private feedback */}
          <FeedbackSection
            tripId={tripId}
            planId={planId}
            userEmail={user.email}
            onSubmit={() => setFeedbackRefresh((n) => n + 1)}
          />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          {/* Cost overview */}
          <Card className="p-5">
            <h2 className="mb-3 font-display text-[15px] font-semibold text-foreground">Cost estimate</h2>
            <p className="text-[24px] font-semibold text-foreground">
              ${plan.costRange.min}–${plan.costRange.max}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">per person (all activities + meals)</p>
          </Card>

          {/* E7: Aggregate results (organizer only) */}
          {isOrganizer && (
            <AggregateResults
              key={feedbackRefresh}
              tripId={tripId}
              planId={planId}
              allEmails={allEmails}
            />
          )}

          {/* E8: Compromise Studio (organizer, when conflicts exist) */}
          {isOrganizer && plan.conflicts.length > 0 && (
            <CompromiseStudio
              conflicts={plan.conflicts}
              options={plan.compromiseOptions}
              onSelect={handleCompromise}
            />
          )}

          {compromiseApplied && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-700">
              <CheckCircle2 size={14} strokeWidth={1.5} />
              Tradeoff selected: &ldquo;{compromiseApplied}&rdquo;. Regenerate plans to apply.
            </div>
          )}

          {/* F2: Stay22 accommodation (only after locking) */}
          {isLocked && <AccommodationSection trip={trip} />}

          {/* Navigation */}
          <div className="flex flex-col gap-2">
            <Link href={`/trips/group/${tripId}/plans`}>
              <Button variant="secondary" fullWidth>
                <ArrowLeft size={14} strokeWidth={1.5} />
                All plans
              </Button>
            </Link>
            {isLocked && (
              <Link href={`/trips/group/${tripId}`}>
                <Button variant="primary" fullWidth>
                  Go to dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
