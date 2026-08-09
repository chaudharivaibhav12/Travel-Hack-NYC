"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-context";
import {
  getTrip,
  getSurvey,
  saveSurvey,
  markSurveyComplete,
  isSurveyComplete,
} from "@/lib/group/store";
import { cn } from "@/lib/utils";
import type { PrivateSurvey, GroupTrip } from "@/lib/group/types";

// ─── Chip / radio button component ───────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-4 py-2 text-[13px] font-medium leading-[18px] transition-colors duration-[140ms]",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {selected && <Check size={12} strokeWidth={2.5} className="mr-1.5" aria-hidden="true" />}
      {label}
    </button>
  );
}

function RadioCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors duration-[140ms]",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:bg-accent/60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary bg-primary" : "border-muted-foreground",
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span>
        <span className={cn("block text-[13.5px] font-medium leading-[18px]", selected ? "text-primary" : "text-foreground")}>
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-[12px] leading-[16px] text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

function MultiCheckCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors duration-[140ms]",
        selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/60",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          selected ? "border-primary bg-primary" : "border-muted-foreground",
        )}
      >
        {selected && <Check size={10} strokeWidth={3} className="text-white" />}
      </span>
      <span className={cn("text-[13px] leading-[18px]", selected ? "font-medium text-primary" : "text-foreground")}>
        {label}
      </span>
    </button>
  );
}

// ─── Empty survey template ────────────────────────────────────────────────────

function emptySurvey(tripId: string): PrivateSurvey {
  return {
    tripId,
    step: 1,
    arrivalDate: "",
    arrivalTime: "",
    departureDate: "",
    departureTime: "",
    joinFullTrip: true,
    fixedCommitments: "",
    scheduleNote: "",
    budgetBand: "",
    budgetFlexibility: "",
    spendingPriorities: [],
    accommodationPreference: "",
    roomPreference: "",
    bathroomPreference: "",
    optionalCostPreference: "",
    dailyPace: "",
    preferredStartTime: "",
    walkingTolerance: "",
    transportPreference: "",
    freeTimeNeed: "",
    groupStylePreference: "",
    dietaryPreferences: "",
    alcoholPreference: "",
    accessibilityNeeds: [],
    sensoryPreferences: [],
    interests: [],
    mustDo: "",
    cannotDo: [],
  };
}

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

const TOTAL_STEPS = 7;

const STEP_LABELS = [
  "Intro",
  "Availability",
  "Budget",
  "Pace",
  "Comfort",
  "Interests",
  "Done",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SurveyPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [trip, setTrip] = useState<GroupTrip | null>(null);
  const [survey, setSurvey] = useState<PrivateSurvey | null>(null);
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [cannotDoInput, setCannotDoInput] = useState("");

  useEffect(() => {
    setMounted(true);
    const t = getTrip(tripId);
    if (!t) { router.replace("/trips/group"); return; }
    setTrip(t);

    if (!user?.email) return;
    const existing = getSurvey(tripId, user.email);
    setSurvey(existing ?? emptySurvey(tripId));
    if (existing?.step) setStep(Math.min(existing.step, TOTAL_STEPS));
  }, [tripId, user?.email, router]);

  if (!mounted || !survey || !trip || !user) return null;

  const alreadyDone = isSurveyComplete(tripId, user.email);

  function update<K extends keyof PrivateSurvey>(key: K, value: PrivateSurvey[K]) {
    setSurvey((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function saveAndNext() {
    if (!survey || !user) return;
    const next = step + 1;
    const updated = { ...survey, step: next };
    saveSurvey(updated, user.email);
    setSurvey(updated);
    if (next <= TOTAL_STEPS) setStep(next);
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  function complete() {
    if (!survey || !user) return;
    const completed = { ...survey, step: TOTAL_STEPS, completedAt: new Date().toISOString() };
    saveSurvey(completed, user.email);
    markSurveyComplete(tripId, user.email);
    router.push(`/trips/group/${tripId}`);
  }

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="mx-auto max-w-[600px]">
      {/* Back link */}
      <div className="mb-5">
        <Link
          href={`/trips/group/${tripId}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors duration-[140ms]"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          {trip.title}
        </Link>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-foreground">
            {STEP_LABELS[step - 1]}
          </span>
          <span className="text-[12px] text-muted-foreground">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Lock size={11} strokeWidth={1.5} />
          Your answers are private and never shown to other travelers
        </div>
      </div>

      {/* Step content */}
      <Card className="p-6">
        {/* ── Step 1: Intro ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="font-display text-[22px] font-semibold leading-[28px] text-foreground">
                This stays private.
              </h1>
              <p className="mt-2 text-[13.5px] leading-[20px] text-muted-foreground">
                Everything you enter here is used only to compute a fair group plan — your individual answers are never shared with other travelers. Only aggregated, anonymized outputs are visible to the group.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {[
                "Takes about 2 minutes",
                "You can update your answers any time before plans are generated",
                "Hard constraints (budget ceiling, dietary restrictions, cannot-dos) are enforced in every plan",
                "AI is used only to write natural-language summaries — the scoring is deterministic and explainable",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] leading-[18px] text-foreground">
                  <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Step 2: Availability ── */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <h1 className="font-display text-[20px] font-semibold leading-[26px] text-foreground">
              Availability &amp; fixed commitments
            </h1>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Arrival date" type="date" value={survey.arrivalDate}
                onChange={(e) => update("arrivalDate", e.target.value)} min={trip.checkin} max={trip.checkout} />
              <Field label="Approx. arrival time" type="time" value={survey.arrivalTime}
                onChange={(e) => update("arrivalTime", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Departure date" type="date" value={survey.departureDate}
                onChange={(e) => update("departureDate", e.target.value)} min={trip.checkin} max={trip.checkout} />
              <Field label="Approx. departure time" type="time" value={survey.departureTime}
                onChange={(e) => update("departureTime", e.target.value)} />
            </div>
            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">Joining the trip</p>
              <div className="flex flex-col gap-2">
                <RadioCard label="Full trip" description="I'll be there the whole time" selected={survey.joinFullTrip}
                  onClick={() => update("joinFullTrip", true)} />
                <RadioCard label="Part of the trip" description="I'm joining for some days only" selected={!survey.joinFullTrip}
                  onClick={() => update("joinFullTrip", false)} />
              </div>
            </div>
            <Field label="Fixed commitments (optional)" placeholder='e.g. "Wedding Saturday 4–8 PM"'
              value={survey.fixedCommitments} onChange={(e) => update("fixedCommitments", e.target.value)} />
            <Field label="Scheduling note (optional)" placeholder={`e.g. "I can't do anything before 6 PM Friday"`}
              value={survey.scheduleNote} onChange={(e) => update("scheduleNote", e.target.value)} />
          </div>
        )}

        {/* ── Step 3: Budget ── */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-[20px] font-semibold leading-[26px] text-foreground">
              Budget &amp; spend style
            </h1>

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">Total trip budget</p>
              <div className="flex flex-col gap-2">
                {[
                  { value: "under-400", label: "Under $400" },
                  { value: "400-600", label: "$400 – 600" },
                  { value: "600-900", label: "$600 – 900" },
                  { value: "900-1300", label: "$900 – 1,300" },
                  { value: "1300+", label: "$1,300+" },
                ].map((opt) => (
                  <RadioCard key={opt.value} label={opt.label} selected={survey.budgetBand === opt.value}
                    onClick={() => update("budgetBand", opt.value)} />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">How flexible is this?</p>
              <div className="flex flex-col gap-2">
                {[
                  { value: "hard", label: "Hard limit", description: "Do not exceed this" },
                  { value: "preferred", label: "Preferred limit", description: "Small flexibility is acceptable" },
                  { value: "flexible", label: "Flexible for one splurge", description: "I can spend more for the right thing" },
                ].map((opt) => (
                  <RadioCard key={opt.value} label={opt.label} description={opt.description}
                    selected={survey.budgetFlexibility === opt.value}
                    onClick={() => update("budgetFlexibility", opt.value)} />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">Top spending priorities <span className="text-muted-foreground">(pick 1–2)</span></p>
              <div className="flex flex-wrap gap-2">
                {["Accommodation", "Food & drinks", "Activities", "Convenience", "Keep costs low"].map((p) => (
                  <Chip key={p} label={p} selected={survey.spendingPriorities.includes(p)}
                    onClick={() => update("spendingPriorities", toggle(survey.spendingPriorities, p))} />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">Accommodation preference</p>
              <div className="flex flex-col gap-2">
                {[
                  "Lowest workable cost",
                  "Best value",
                  "Comfortable and well-located",
                  "Hotel experience matters most",
                ].map((p) => (
                  <RadioCard key={p} label={p} selected={survey.accommodationPreference === p}
                    onClick={() => update("accommodationPreference", p)} />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">Room preference</p>
              <div className="flex flex-wrap gap-2">
                {["Fine sharing a room", "Need my own bed", "Need a private room"].map((p) => (
                  <Chip key={p} label={p} selected={survey.roomPreference === p}
                    onClick={() => update("roomPreference", p)} />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">Bathroom preference</p>
              <div className="flex flex-wrap gap-2">
                {["Fine sharing a bathroom", "Need a private bathroom"].map((p) => (
                  <Chip key={p} label={p} selected={survey.bathroomPreference === p}
                    onClick={() => update("bathroomPreference", p)} />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">
                If part of the group wants a pricier activity, are you okay doing something else?
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { value: "split", label: "Yes, split up if needed" },
                  { value: "sometimes", label: "Sometimes, if we reunite afterward" },
                  { value: "together", label: "No, I prefer shared activities" },
                ].map((opt) => (
                  <RadioCard key={opt.value} label={opt.label} selected={survey.optionalCostPreference === opt.value}
                    onClick={() => update("optionalCostPreference", opt.value)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Pace & Logistics ── */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-[20px] font-semibold leading-[26px] text-foreground">
              Pace &amp; logistics
            </h1>
            {[
              {
                field: "dailyPace" as const,
                label: "Daily pace",
                options: [
                  { value: "relaxed", label: "Relaxed", description: "Fewer activities, lots of breathing room" },
                  { value: "balanced", label: "Balanced", description: "A mix of activities and downtime" },
                  { value: "full", label: "Full day", description: "Pack as much in as possible" },
                ],
              },
              {
                field: "preferredStartTime" as const,
                label: "Preferred start time",
                options: [
                  { value: "early", label: "Early (before 9 AM)" },
                  { value: "mid", label: "Around 9–10 AM" },
                  { value: "late", label: "Late start (10 AM+)" },
                ],
              },
              {
                field: "walkingTolerance" as const,
                label: "Walking tolerance",
                options: [
                  { value: "short", label: "Short walks only" },
                  { value: "moderate", label: "Moderate walking" },
                  { value: "lots", label: "Lots of walking is fine" },
                ],
              },
              {
                field: "transportPreference" as const,
                label: "Transport preference",
                options: [
                  { value: "transit", label: "Public transit" },
                  { value: "mix", label: "Mix of transit and rideshares" },
                  { value: "rideshare", label: "Rideshares are fine" },
                ],
              },
              {
                field: "freeTimeNeed" as const,
                label: "Need for free time",
                options: [
                  { value: "none", label: "None — fill the schedule" },
                  { value: "some", label: "Some free time each day" },
                  { value: "lots", label: "A few hours of free time daily" },
                ],
              },
              {
                field: "groupStylePreference" as const,
                label: "Group style",
                options: [
                  { value: "together", label: "Mostly together" },
                  { value: "occasional-split", label: "Open to splitting occasionally" },
                  { value: "split", label: "Prefer several solo blocks" },
                ],
              },
            ].map(({ field, label, options }) => (
              <div key={field}>
                <p className="mb-2.5 text-[12.5px] font-medium text-foreground">{label}</p>
                <div className="flex flex-col gap-2">
                  {options.map((opt) => (
                    <RadioCard key={opt.value} label={opt.label} description={(opt as { description?: string }).description}
                      selected={survey[field] === opt.value}
                      onClick={() => update(field, opt.value)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 5: Food, Accessibility & Comfort ── */}
        {step === 5 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="font-display text-[20px] font-semibold leading-[26px] text-foreground">
                Food, accessibility &amp; comfort
              </h1>
              <p className="mt-1 text-[12.5px] text-muted-foreground">All optional — only fill in what's relevant to you.</p>
            </div>

            <Field label="Dietary preferences or allergies (optional)" placeholder="e.g. vegan, gluten-free, nut allergy"
              value={survey.dietaryPreferences} onChange={(e) => update("dietaryPreferences", e.target.value)} />

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">Alcohol preference</p>
              <div className="flex flex-col gap-2">
                {[
                  { value: "include-nightlife", label: "Include nightlife" },
                  { value: "fine-either-way", label: "Fine either way" },
                  { value: "non-alcohol", label: "Prefer non-alcohol-focused activities" },
                ].map((opt) => (
                  <RadioCard key={opt.value} label={opt.label} selected={survey.alcoholPreference === opt.value}
                    onClick={() => update("alcoholPreference", opt.value)} />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">Accessibility needs (select all that apply)</p>
              <div className="flex flex-col gap-2">
                {["Step-free access", "Wheelchair access", "Elevator required", "Stroller-friendly", "Limited walking"].map((need) => (
                  <MultiCheckCard key={need} label={need} selected={survey.accessibilityNeeds.includes(need)}
                    onClick={() => update("accessibilityNeeds", toggle(survey.accessibilityNeeds, need))} />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">Sensory preferences (select all that apply)</p>
              <div className="flex flex-col gap-2">
                {["Quieter venues", "Avoid large crowds", "Avoid late-night places"].map((pref) => (
                  <MultiCheckCard key={pref} label={pref} selected={survey.sensoryPreferences.includes(pref)}
                    onClick={() => update("sensoryPreferences", toggle(survey.sensoryPreferences, pref))} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 6: Interests, Must-Dos & Avoids ── */}
        {step === 6 && (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-[20px] font-semibold leading-[26px] text-foreground">
              Interests, must-dos &amp; avoids
            </h1>

            <div>
              <p className="mb-2.5 text-[12.5px] font-medium text-foreground">
                Top interests <span className="text-muted-foreground">(pick up to 3)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {["food", "art", "history", "shopping", "live music", "nightlife", "outdoors", "wellness", "sports", "family activities", "local culture"].map((interest) => (
                  <Chip
                    key={interest}
                    label={interest.charAt(0).toUpperCase() + interest.slice(1)}
                    selected={survey.interests.includes(interest)}
                    onClick={() => {
                      if (survey.interests.includes(interest)) {
                        update("interests", survey.interests.filter((i) => i !== interest));
                      } else if (survey.interests.length < 3) {
                        update("interests", [...survey.interests, interest]);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            <Field label="One specific must-do (optional)" placeholder='e.g. "Visit the MoMA" or "Try the local street food"'
              value={survey.mustDo} onChange={(e) => update("mustDo", e.target.value)} />

            <div>
              <p className="mb-2 text-[12.5px] font-medium text-foreground">
                Cannot do (activities to exclude from the plan)
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field
                    label=""
                    placeholder='e.g. "No clubbing" or "No early mornings"'
                    value={cannotDoInput}
                    onChange={(e) => setCannotDoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && cannotDoInput.trim()) {
                        e.preventDefault();
                        update("cannotDo", [...survey.cannotDo, cannotDoInput.trim()]);
                        setCannotDoInput("");
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (cannotDoInput.trim()) {
                      update("cannotDo", [...survey.cannotDo, cannotDoInput.trim()]);
                      setCannotDoInput("");
                    }
                  }}
                  className="mt-0 inline-flex h-11 items-center rounded-full border border-border bg-card px-4 text-[13px] font-medium hover:bg-accent"
                >
                  Add
                </button>
              </div>
              {survey.cannotDo.length > 0 && (
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {survey.cannotDo.map((item) => (
                    <li key={item} className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[12px] text-red-700">
                      {item}
                      <button
                        type="button"
                        onClick={() => update("cannotDo", survey.cannotDo.filter((c) => c !== item))}
                        className="ml-1 hover:text-red-900"
                        aria-label={`Remove ${item}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── Step 7: Done ── */}
        {step === 7 && (
          <div className="flex flex-col gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check size={24} strokeWidth={2} className="text-emerald-700" />
            </div>
            <div>
              <h1 className="font-display text-[22px] font-semibold leading-[28px] text-foreground">
                Your answers are saved.
              </h1>
              <p className="mt-2 text-[13.5px] leading-[20px] text-muted-foreground">
                They're stored privately on this device and will only ever appear to you as personalized plan explanations — never to other travelers.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {[
                "Add trip ideas to the Research Inbox — links, screenshots, and notes",
                "Check the group dashboard to see when others have completed their surveys",
                "The organizer can generate plans once enough surveys are in",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] leading-[18px] text-foreground">
                  <ArrowRight size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between">
        {step > 1 ? (
          <Button variant="secondary" onClick={goBack}>
            <ArrowLeft size={15} strokeWidth={1.5} />
            Back
          </Button>
        ) : (
          <Link href={`/trips/group/${tripId}`}>
            <Button variant="ghost">
              <ArrowLeft size={15} strokeWidth={1.5} />
              Dashboard
            </Button>
          </Link>
        )}

        {step < TOTAL_STEPS ? (
          <Button variant="primary" onClick={saveAndNext}>
            Next
            <ArrowRight size={15} strokeWidth={1.5} />
          </Button>
        ) : (
          <div className="flex gap-3">
            <Link href={`/trips/group/${tripId}/inbox`}>
              <Button variant="secondary">Add trip ideas</Button>
            </Link>
            <Button variant="primary" onClick={complete}>
              {alreadyDone ? "Update &amp; go to dashboard" : "Save &amp; go to dashboard"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
