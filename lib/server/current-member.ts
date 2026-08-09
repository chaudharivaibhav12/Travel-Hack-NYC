import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session";
import { getTrip, type Trip, type Member } from "@/lib/server/trips";

export interface CurrentMemberResult {
  trip: Trip;
  member: Member;
}

/**
 * Resolves "the signed-in user's own member row on this trip" — every
 * preferences step page needs this to know who it's saving for. Returns
 * null if the trip doesn't exist, nobody's signed in, or the signed-in user
 * isn't a member yet (auto-join failed, or a future invite-link joiner who
 * hasn't joined) — callers render their own explanatory state rather than
 * crashing, per MasterPrompt §12.
 */
export async function getCurrentMember(tripId: string): Promise<CurrentMemberResult | null> {
  const cookieStore = await cookies();
  const user = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) return null;

  const data = await getTrip(tripId);
  if (!data) return null;

  const member = data.members.find((candidate) => candidate.user_id === user.id);
  if (!member) return null;

  return { trip: data.trip, member };
}
