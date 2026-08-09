"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  ClipboardList,
  Lightbulb,
  Sparkles,
  Lock,
  Share2,
  MapPin,
  CalendarDays,
  AlertCircle,
  Loader2,
  CloudRain,
  XCircle,
  Clock3,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-context";
import { getGroupTripRemote } from "@/lib/group/api";
import { getPlans, getPlan, updatePlan } from "@/lib/group/store";
import { cn } from "@/lib/utils";
import type { GroupTrip, GeneratedPlan, ChangeEvent } from "@/lib/group/types";

const CHANGE_EVENTS: ChangeEvent[] = [
  {
    id: "rain",
    label: "Rain starts Saturday afternoon",
    description: "Heavy rain forecast for 2–5 PM Saturday.",
    affectedDay: 2,
    resolution: "Replaced Central Park walk with an indoor gallery visit 10 minutes away. 5 PM reunion dinner is preserved.",
  },
  {
    id: "restaurant-closed",
    label: "Restaurant is unavailable",
    description: "The booked dinner reservation at the group restaurant is cancelled.",
    affectedDay: 2,
    resolution: "Replaced with a highly-rated local alternative 3 minutes away, same cuisine, similar price range.",
  },
  {
    id: "late-arrival",
    label: "A traveler arrives two hours late",
    description: "One member's flight is delayed by 2 hours.",
    affectedDay: 1,
    resolution: "Day 1 arrival activity pushed to 4 PM. Welcome dinner shifted 1 hour later. Traveler joins at dinner.",
  },
  {
    id: "museum-closes",
    label: "Museum closes early",
    description: "The scheduled museum closes at 3 PM instead of 6 PM today.",
    affectedDay: 2,
    resolution: "Museum visit moved to morning slot. Afternoon split block shuffled — reunion time unchanged.",
  },
  {
    id: "reduce-spending",
    label: "The group wants to reduce spending",
    description: "Group decides to cut today's estimated spend by ~$30/person.",
    affectedDay: 2,
    resolution: "Premium restaurant dinner replaced with food market meal ($15 savings/person). Activity tier reduced by one.",
  },
];

function MemberRow({
  email,
  isOrganizer,
  surveyDone,
  isYou,
}: {
  email: string;
  isOrganizer: boolean;
  surveyDone: boolean;
  isYou: boolean;
}) {
  const initial = email[0].toUpperCase();
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-foreground">
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium leading-[18px] text-foreground">
          {email}{isYou && <span className="ml-1 text-[11px] text-muted-foreground">(you)</span>}
        </span>
        {isOrganizer && (
          <span className="block text-[11.5px] text-muted-foreground">Organizer</span>
        )}
      </span>
      {surveyDone ? (
        <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600">
          <CheckCircle2 size={13} strokeWidth={1.5} />
          Survey done
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
          <Clock size={13} strokeWidth={1.5} />
          Pending
        </span>
      )}
    </li>
  );
}

export default function GroupDashboardPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [trip, setTrip] = useState<GroupTrip | null>(null);
  const [plans, setPlans] = useState<GeneratedPlan[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const [generatingChange, setGeneratingChange] = useState(false);
  const [appliedChange, setAppliedChange] = useState<ChangeEvent | null>(null);
  const [shareText, setShareText] = useState("");
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPlans(getPlans(tripId));
    void getGroupTripRemote(tripId)
      .then(({ trip: remoteTrip, surveyStatuses }) => {
        setTrip(remoteTrip);
        setStatuses(surveyStatuses);
      })
      .catch(() => router.replace("/trips/group"));
  }, [tripId, router]);

  if (!mounted || !trip || !user) return null;

  const isOrganizer = trip.organizerEmail === user.email;
  const allEmails = [trip.organizerEmail, ...trip.invitedEmails];
  const completedCount = allEmails.filter((e) => statuses[e] === "complete").length;
  const myDone = statuses[user.email] === "complete";
  const hasPlan = plans.length > 0;
  const lockedPlan = trip.lockedPlanId ? getPlan(tripId, trip.lockedPlanId) : null;
  const canGenerate = isOrganizer && completedCount >= Math.ceil(allEmails.length / 2);

  const start = new Date(trip.checkin).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const end = new Date(trip.checkout).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const nights = Math.ceil((new Date(trip.checkout).getTime() - new Date(trip.checkin).getTime()) / 86400000);

  const handleTriggerChange = async (event: ChangeEvent) => {
    setGeneratingChange(true);
    await new Promise((r) => setTimeout(r, 1800));
    setAppliedChange(event);
    setGeneratingChange(false);
    if (trip.lockedPlanId) {
      updatePlan(tripId, trip.lockedPlanId, {});
    }
  };

  const handleShare = () => {
    const nightLabel = `${nights} night${nights !== 1 ? "s" : ""}`;
    const text = [
      `✈ ${trip.title}`,
      `📍 ${trip.destination}`,
      `📅 ${start} – ${end} (${nightLabel})`,
      `👥 ${allEmails.length} traveler${allEmails.length !== 1 ? "s" : ""}`,
      lockedPlan ? `✅ Plan locked: ${lockedPlan.title}` : "🔍 Still planning",
    ].join("\n");
    setShareText(text);
    setShowShare(true);
  };

  const CHANGE_EVENT_ICONS: Record<string, React.ReactNode> = {
    rain: <CloudRain size={15} strokeWidth={1.5} />,
    "restaurant-closed": <XCircle size={15} strokeWidth={1.5} />,
    "late-arrival": <Clock3 size={15} strokeWidth={1.5} />,
    "museum-closes": <XCircle size={15} strokeWidth={1.5} />,
    "reduce-spending": <TrendingDown size={15} strokeWidth={1.5} />,
  };

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/trips/group"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors duration-[140ms]"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Group Trips
        </Link>
      </div>

      <div className="mb-[34px] flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={trip.title} subtitle={trip.destination} />
        <div className="flex gap-2.5">
          {trip.status === "locked" && (
            <Button variant="secondary" onClick={handleShare}>
              <Share2 size={15} strokeWidth={1.5} />
              Share
            </Button>
          )}
          {!myDone && (
            <Link href={`/trips/group/${tripId}/survey`}>
              <Button variant="primary">
                <ClipboardList size={15} strokeWidth={1.5} />
                My survey
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Trip info strip */}
      <Card className="mb-5 p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: <CalendarDays size={15} strokeWidth={1.5} />, label: "Check-in", value: start },
            { icon: <CalendarDays size={15} strokeWidth={1.5} />, label: "Check-out", value: end },
            { icon: <MapPin size={15} strokeWidth={1.5} />, label: "Destination", value: trip.destination },
            { icon: <Users size={15} strokeWidth={1.5} />, label: "Travelers", value: `${allEmails.length} people` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="flex items-center gap-1 text-[11.5px] leading-none text-muted-foreground">{icon}{label}</dt>
              <dd className="text-[13.5px] font-medium leading-[18px] text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="flex flex-col gap-5">
          {/* Status card */}
          {trip.status !== "locked" && (
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[17px] font-semibold leading-[22px] text-foreground">
                  Survey progress
                </h2>
                <span className="text-[13px] text-muted-foreground">
                  {completedCount} / {allEmails.length} complete
                </span>
              </div>

              <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${(completedCount / allEmails.length) * 100}%` }}
                />
              </div>

              {!myDone && (
                <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3.5">
                  <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-[13px] font-medium text-amber-800">Your survey is pending</p>
                    <p className="mt-0.5 text-[12px] text-amber-700">Fill it in so your preferences can be included in the plan.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {!myDone && (
                  <Link href={`/trips/group/${tripId}/survey`}>
                    <Button variant="primary">
                      <ClipboardList size={15} strokeWidth={1.5} />
                      Fill in my survey
                    </Button>
                  </Link>
                )}
                {isOrganizer && hasPlan ? (
                  <Link href={`/trips/group/${tripId}/plans`}>
                    <Button variant={myDone ? "primary" : "secondary"}>
                      <Sparkles size={15} strokeWidth={1.5} />
                      View plans
                    </Button>
                  </Link>
                ) : isOrganizer && canGenerate ? (
                  <Link href={`/trips/group/${tripId}/plans`}>
                    <Button variant={myDone ? "primary" : "secondary"}>
                      <Sparkles size={15} strokeWidth={1.5} />
                      Generate plans
                    </Button>
                  </Link>
                ) : isOrganizer ? (
                  <Button variant="secondary" disabled>
                    <Sparkles size={15} strokeWidth={1.5} />
                    Generate plans
                    <span className="text-[11px] text-muted-foreground">(waiting for surveys)</span>
                  </Button>
                ) : !hasPlan ? (
                  <p className="text-[12.5px] text-muted-foreground">
                    The organizer will generate plans once enough surveys are done.
                  </p>
                ) : (
                  <Link href={`/trips/group/${tripId}/plans`}>
                    <Button variant="primary">
                      <Sparkles size={15} strokeWidth={1.5} />
                      View plans
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          )}

          {/* Locked plan summary */}
          {trip.status === "locked" && lockedPlan && (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center gap-3 border-b border-border bg-emerald-50 px-5 py-3">
                <Lock size={15} strokeWidth={1.5} className="text-emerald-700" />
                <span className="text-[13px] font-semibold text-emerald-800">Plan locked: {lockedPlan.title}</span>
              </div>
              <div className="p-6">
                <p className="mb-4 text-[13.5px] text-muted-foreground">{lockedPlan.tagline}</p>
                <ol className="flex flex-col gap-3">
                  {lockedPlan.days.map((day) => (
                    <li key={day.day} className="flex items-start gap-3 text-[13px] leading-[18px]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground">
                        {day.day}
                      </span>
                      <span>
                        <span className="font-medium text-foreground">{day.date}</span>
                        <span className="ml-2 text-muted-foreground">
                          {day.activities.slice(0, 2).map((a) => a.title).join(" → ")}
                          {day.activities.length > 2 && " …"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex gap-3">
                  <Link href={`/trips/group/${tripId}/plans/${lockedPlan.id}`}>
                    <Button variant="secondary">
                      View full itinerary
                      <ChevronRight size={15} strokeWidth={1.5} />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* Research inbox preview */}
          <Link
            href={`/trips/group/${tripId}/inbox`}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 shadow-page transition-[transform,box-shadow] duration-[160ms] ease-out hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="flex items-center gap-3">
              <Lightbulb size={18} strokeWidth={1.5} className="text-muted-foreground" />
              <span>
                <span className="block text-[14px] font-semibold text-foreground">Research Inbox</span>
                <span className="block text-[12px] text-muted-foreground">Drop links, screenshots, and place ideas here</span>
              </span>
            </span>
            <ChevronRight size={16} strokeWidth={1.5} className="text-muted-foreground" />
          </Link>
        </div>

        {/* Sidebar: members + change events */}
        <div className="flex flex-col gap-5">
          {/* Members */}
          <Card className="p-5">
            <h2 className="mb-3 font-display text-[15px] font-semibold leading-[20px] text-foreground">
              Travelers ({allEmails.length})
            </h2>
            <ul className="divide-y divide-border">
              {allEmails.map((email) => (
                <MemberRow
                  key={email}
                  email={email}
                  isOrganizer={email === trip.organizerEmail}
                  surveyDone={statuses[email] === "complete"}
                  isYou={email === user.email}
                />
              ))}
            </ul>
          </Card>

          {/* Change events (demo, locked plans only) */}
          {trip.status === "locked" && isOrganizer && (
            <Card className="p-5">
              <h2 className="mb-1 font-display text-[15px] font-semibold leading-[20px] text-foreground">
                Simulate a change
              </h2>
              <p className="mb-3 text-[12px] text-muted-foreground">
                Demo-only: trigger a real-world event and see how the plan adapts.
              </p>

              {generatingChange && (
                <div className="mb-3 flex items-center gap-2 text-[13px] text-primary">
                  <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
                  Re-planning affected blocks…
                </div>
              )}

              {appliedChange && !generatingChange && (
                <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[12.5px] font-medium text-emerald-800">{appliedChange.label}</p>
                  <p className="mt-1 text-[12px] text-emerald-700">{appliedChange.resolution}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {CHANGE_EVENTS.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => void handleTriggerChange(ev)}
                    disabled={generatingChange}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2.5 text-left text-[12.5px] text-foreground",
                      "hover:bg-accent hover:text-accent-foreground transition-colors duration-[140ms]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {CHANGE_EVENT_ICONS[ev.id]}
                    </span>
                    {ev.label}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Share modal */}
      {showShare && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowShare(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 font-display text-[17px] font-semibold text-foreground">Share itinerary</h3>
            <textarea
              readOnly
              value={shareText}
              className="h-40 w-full resize-none rounded-md border border-border bg-background p-3 text-[13px] font-mono text-foreground"
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowShare(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => void navigator.clipboard?.writeText(shareText)}
              >
                Copy for WhatsApp / iMessage
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
