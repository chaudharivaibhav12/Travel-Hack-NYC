"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-context";
import { createGroupTripRemote } from "@/lib/group/api";
import { cn } from "@/lib/utils";

type LookupState = "idle" | "searching" | "found" | "not-found" | "error";

interface InvitedMember {
  email: string;
  displayName: string;
  status: LookupState;
}

interface UserSuggestion { id: string; email: string; name: string; avatar?: string }

const BACKEND = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

async function searchUsers(email: string): Promise<UserSuggestion[]> {
  try {
    const res = await fetch(`${BACKEND}/users/search?email=${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { users?: UserSuggestion[] };
    return data.users ?? [];
  } catch {
    return [];
  }
}

export default function NewGroupTripPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");

  const [emailInput, setEmailInput] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = emailInput.trim().toLowerCase();
    if (query.length < 3) return;
    const timeout = window.setTimeout(() => {
      setLookupState("searching");
      void searchUsers(query).then((users) => {
        setSuggestions(users.filter((candidate) => candidate.email !== user?.email));
        setLookupState("idle");
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [emailInput, user?.email]);

  const addSuggestion = useCallback((candidate: UserSuggestion) => {
    if (invitedMembers.some((member) => member.email === candidate.email)) return;
    setInvitedMembers((previous) => [...previous, {
      email: candidate.email,
      displayName: candidate.name,
      status: "found",
    }]);
    setEmailInput("");
    setSuggestions([]);
    setLookupState("found");
  }, [invitedMembers]);

  const handleAddEmail = useCallback(async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (email === user?.email) { setError("You're already the organizer — no need to add yourself."); return; }
    if (invitedMembers.some((m) => m.email === email)) { setError("This email is already in the list."); return; }

    setError("");
    setLookupState("searching");

    const result = (await searchUsers(email)).find((candidate) => candidate.email === email);

    if (result) {
      setInvitedMembers((prev) => [
        ...prev,
        { email, displayName: result.name, status: "found" },
      ]);
      setLookupState("found");
    } else {
      // Still add them — they'll see the trip when they join the platform
      setInvitedMembers((prev) => [
        ...prev,
        {
          email,
          displayName: email.split("@")[0],
          status: "not-found",
        },
      ]);
      setLookupState("not-found");
    }

    setEmailInput("");
    setTimeout(() => setLookupState("idle"), 1500);
  }, [emailInput, user?.email, invitedMembers]);

  const removeMember = (email: string) => {
    setInvitedMembers((prev) => prev.filter((m) => m.email !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim()) { setError("Trip title is required."); return; }
    if (!destination.trim()) { setError("Destination is required."); return; }
    if (!checkin) { setError("Check-in date is required."); return; }
    if (!checkout || checkout <= checkin) { setError("Check-out must be after check-in."); return; }

    setSubmitting(true);
    setError("");

    try {
      const { tripId } = await createGroupTripRemote({
        title: title.trim(),
        destination: destination.trim(),
        checkin,
        checkout,
        organizerEmail: user.email,
        organizerUserId: user.id,
        invitedEmails: invitedMembers.map((m) => m.email),
      });
      router.push(`/trips/group/${tripId}/survey`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trip. Is the backend running?");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/trips/group"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground transition-colors duration-[140ms]"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Group Trips
        </Link>
      </div>

      <PageHeader
        title="Create a group trip"
        subtitle="You'll fill in your private preferences right after. Other travelers join by email."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Trip details */}
        <Card className="p-6">
          <h2 className="mb-5 font-display text-[17px] font-semibold leading-[22px] text-foreground">
            Trip details
          </h2>
          <div className="flex flex-col gap-4">
            <Field
              label="Trip name"
              placeholder="e.g. NYC Weekend with the crew"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Field
              label="Destination"
              placeholder="e.g. New York City, NY"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Check-in"
                type="date"
                value={checkin}
                onChange={(e) => setCheckin(e.target.value)}
                required
              />
              <Field
                label="Check-out"
                type="date"
                value={checkout}
                onChange={(e) => setCheckout(e.target.value)}
                min={checkin}
                required
              />
            </div>
          </div>
        </Card>

        {/* Add travelers by email */}
        <Card className="p-6">
          <h2 className="mb-1 font-display text-[17px] font-semibold leading-[22px] text-foreground">
            Add travelers
          </h2>
          <p className="mb-5 text-[12.5px] leading-[18px] text-muted-foreground">
            Enter the email addresses of people registered in the system. They&rsquo;ll see this trip when they sign in.
          </p>

          <div className="flex gap-3">
            <div className="flex-1">
              <Field
                label="Email address"
                type="email"
                placeholder="friend@example.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (e.target.value.trim().length < 3) setSuggestions([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); void handleAddEmail(); }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleAddEmail()}
              disabled={lookupState === "searching" || !emailInput.trim()}
              className={cn(
                "mt-[22px] inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold",
                "border border-border bg-card transition-colors duration-[140ms]",
                "hover:bg-accent hover:text-accent-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {lookupState === "searching" ? (
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <UserPlus size={14} strokeWidth={1.5} />
              )}
              Add
            </button>
          </div>

          {suggestions.length > 0 ? (
            <ul className="mt-2 overflow-hidden rounded-md border border-border bg-card shadow-page">
              {suggestions.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => addSuggestion(candidate)}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-accent"
                  >
                    <span>
                      <span className="block text-[13.5px] font-medium text-foreground">{candidate.name}</span>
                      <span className="block text-[12px] text-muted-foreground">{candidate.email}</span>
                    </span>
                    <UserPlus size={15} className="text-primary" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {lookupState === "not-found" && (
            <p className="mt-2 text-[12px] text-amber-600">
              No account found. They&rsquo;ll see the trip when they join the platform.
            </p>
          )}
          {lookupState === "found" && (
            <p className="mt-2 text-[12px] text-emerald-600">
              User found and added.
            </p>
          )}

          {invitedMembers.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {invitedMembers.map((m) => (
                <li
                  key={m.email}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3.5 py-2.5"
                >
                  <span className="flex items-center gap-2.5">
                    {m.status === "found" ? (
                      <CheckCircle2 size={15} strokeWidth={1.5} className="shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle size={15} strokeWidth={1.5} className="shrink-0 text-amber-500" />
                    )}
                    <span>
                      <span className="block text-[13.5px] font-medium leading-[18px] text-foreground">
                        {m.displayName}
                      </span>
                      <span className="block text-[12px] leading-[16px] text-muted-foreground">
                        {m.email}
                        {m.status === "not-found" && " · invite pending"}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMember(m.email)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    aria-label={`Remove ${m.email}`}
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {invitedMembers.length === 0 && (
            <p className="mt-4 text-[12.5px] text-muted-foreground">
              You can also add travelers later from the group dashboard.
            </p>
          )}
        </Card>

        {error && (
          <p className="text-[13px] text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />}
            Create trip &amp; start my survey
          </Button>
          <Link href="/trips/group">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
