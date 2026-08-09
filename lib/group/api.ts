import type { GroupTrip, PrivateSurvey } from './types'

const BACKEND = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8001'

// ─── Trip ─────────────────────────────────────────────────────────────────────

export async function createGroupTripRemote(params: {
  title: string
  destination: string
  checkin: string
  checkout: string
  organizerEmail: string
  organizerUserId?: string
  invitedEmails: string[]
}): Promise<{ tripId: string; trip: GroupTrip }> {
  const res = await fetch(`${BACKEND}/group-trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: params.title,
      destination: params.destination,
      checkin: params.checkin,
      checkout: params.checkout,
      organizer_email: params.organizerEmail,
      organizer_user_id: params.organizerUserId ?? null,
      invited_emails: params.invitedEmails,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { trip_id: string; trip: Record<string, unknown> }
  return { tripId: data.trip_id, trip: dbToGroupTrip(data.trip) }
}

export async function listGroupTripsRemote(email: string): Promise<{
  trips: GroupTrip[]
  surveyStatuses: Record<string, Record<string, string>>
}> {
  const res = await fetch(`${BACKEND}/group-trips?email=${encodeURIComponent(email)}`)
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { trips: Record<string, unknown>[] }
  const trips = data.trips.map(dbToGroupTrip)
  const surveyStatuses: Record<string, Record<string, string>> = {}
  for (const raw of data.trips) {
    surveyStatuses[raw['id'] as string] = (raw['survey_statuses'] as Record<string, string>) ?? {}
  }
  return { trips, surveyStatuses }
}

export async function getGroupTripRemote(tripId: string): Promise<{
  trip: GroupTrip
  surveyStatuses: Record<string, string>
}> {
  const res = await fetch(`${BACKEND}/group-trips/${tripId}`)
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { trip: Record<string, unknown>; survey_statuses: Record<string, string> }
  return { trip: dbToGroupTrip(data.trip), surveyStatuses: data.survey_statuses ?? {} }
}

export async function updateGroupTripRemote(tripId: string, status: GroupTrip['status']): Promise<void> {
  const res = await fetch(`${BACKEND}/group-trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export interface GroupInvitation {
  id: string
  trip_id: string
  inviter_email: string
  invitee_email: string
  status: 'pending' | 'accepted' | 'declined'
  trip: Record<string, unknown>
}

export async function listPendingInvitations(email: string): Promise<GroupInvitation[]> {
  const res = await fetch(`${BACKEND}/group-trips/invitations/pending?email=${encodeURIComponent(email)}`)
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { invitations: GroupInvitation[] }
  return data.invitations ?? []
}

export async function respondToInvitation(
  tripId: string,
  email: string,
  response: 'accepted' | 'declined',
): Promise<void> {
  const res = await fetch(`${BACKEND}/group-trips/${tripId}/invitations/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, response }),
  })
  if (!res.ok) throw new Error(await res.text())
}

// ─── Survey ───────────────────────────────────────────────────────────────────

export async function saveSurveyRemote(
  tripId: string,
  survey: PrivateSurvey,
  userEmail: string,
  userId: string | undefined,
  completed = false,
): Promise<void> {
  const res = await fetch(`${BACKEND}/group-trips/${tripId}/surveys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_email: userEmail,
      user_id: userId ?? null,
      arrival_date: survey.arrivalDate || null,
      arrival_time: survey.arrivalTime,
      departure_date: survey.departureDate || null,
      departure_time: survey.departureTime,
      join_full_trip: survey.joinFullTrip,
      fixed_commitments: survey.fixedCommitments,
      schedule_note: survey.scheduleNote,
      budget_band: survey.budgetBand,
      budget_flexibility: survey.budgetFlexibility,
      spending_priorities: survey.spendingPriorities,
      accommodation_preference: survey.accommodationPreference,
      room_preference: survey.roomPreference,
      bathroom_preference: survey.bathroomPreference,
      optional_cost_preference: survey.optionalCostPreference,
      daily_pace: survey.dailyPace,
      preferred_start_time: survey.preferredStartTime,
      walking_tolerance: survey.walkingTolerance,
      transport_preference: survey.transportPreference,
      free_time_need: survey.freeTimeNeed,
      group_style_preference: survey.groupStylePreference,
      dietary_preferences: survey.dietaryPreferences,
      alcohol_preference: survey.alcoholPreference,
      accessibility_needs: survey.accessibilityNeeds,
      sensory_preferences: survey.sensoryPreferences,
      interests: survey.interests,
      must_do: survey.mustDo,
      cannot_do: survey.cannotDo,
      completed,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function getSurveyRemote(
  tripId: string,
  userEmail: string,
): Promise<{ survey: PrivateSurvey; completed: boolean } | null> {
  const res = await fetch(
    `${BACKEND}/group-trips/${tripId}/surveys/${encodeURIComponent(userEmail)}`,
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { survey: Record<string, unknown> }
  return dbToSurvey(tripId, data.survey)
}

// ─── Generate context (fetch structured data to pass to Claude) ───────────────

export interface GenerateContextMember {
  email: string
  availability: Record<string, unknown>
  budget: Record<string, unknown>
  pace: Record<string, unknown>
  comfort: Record<string, unknown>
  interests: Record<string, unknown>
}

export async function getGenerateContext(tripId: string): Promise<{
  trip: {
    id: string
    title: string
    destination: string
    checkin: string
    checkout: string
    organizer_email: string
    invited_emails: string[]
  }
  members: GenerateContextMember[]
}> {
  const res = await fetch(`${BACKEND}/group-trips/${tripId}/generate-context`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function generateContextMemberToSurvey(tripId: string, member: GenerateContextMember): PrivateSurvey {
  const { availability, budget, pace, comfort, interests } = member
  return {
    tripId,
    step: 7,
    completedAt: new Date().toISOString(),
    arrivalDate: String(availability.arrival_date ?? ''),
    arrivalTime: String(availability.arrival_time ?? ''),
    departureDate: String(availability.departure_date ?? ''),
    departureTime: String(availability.departure_time ?? ''),
    joinFullTrip: availability.join_full_trip !== false,
    fixedCommitments: String(availability.fixed_commitments ?? ''),
    scheduleNote: String(availability.schedule_note ?? ''),
    budgetBand: String(budget.band ?? ''),
    budgetFlexibility: String(budget.flexibility ?? ''),
    spendingPriorities: (budget.spending_priorities as string[]) ?? [],
    accommodationPreference: String(budget.accommodation_preference ?? ''),
    roomPreference: String(budget.room_preference ?? ''),
    bathroomPreference: String(budget.bathroom_preference ?? ''),
    optionalCostPreference: String(budget.optional_cost_preference ?? ''),
    dailyPace: String(pace.daily_pace ?? ''),
    preferredStartTime: String(pace.preferred_start_time ?? ''),
    walkingTolerance: String(pace.walking_tolerance ?? ''),
    transportPreference: String(pace.transport_preference ?? ''),
    freeTimeNeed: String(pace.free_time_need ?? ''),
    groupStylePreference: String(pace.group_style_preference ?? ''),
    dietaryPreferences: String(comfort.dietary_preferences ?? ''),
    alcoholPreference: String(comfort.alcohol_preference ?? ''),
    accessibilityNeeds: (comfort.accessibility_needs as string[]) ?? [],
    sensoryPreferences: (comfort.sensory_preferences as string[]) ?? [],
    interests: (interests.interests as string[]) ?? [],
    mustDo: String(interests.must_do ?? ''),
    cannotDo: (interests.cannot_do as string[]) ?? [],
  }
}

// ─── Itineraries ──────────────────────────────────────────────────────────────

export async function saveItineraryRemote(
  tripId: string,
  memberEmail: string,
  content: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${BACKEND}/group-trips/${tripId}/itineraries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ member_email: memberEmail, content }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function listItinerariesRemote(
  tripId: string,
): Promise<{ member_email: string; content: Record<string, unknown>; created_at: string }[]> {
  const res = await fetch(`${BACKEND}/group-trips/${tripId}/itineraries`)
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { itineraries: { member_email: string; content: Record<string, unknown>; created_at: string }[] }
  return data.itineraries
}

// ─── DB → TS converters ───────────────────────────────────────────────────────

function dbToGroupTrip(raw: Record<string, unknown>): GroupTrip {
  return {
    id:             raw['id'] as string,
    title:          raw['title'] as string,
    destination:    raw['destination'] as string,
    checkin:        raw['checkin'] as string,
    checkout:       raw['checkout'] as string,
    organizerEmail: raw['organizer_email'] as string,
    invitedEmails:  (raw['invited_emails'] as string[]) ?? [],
    status:         (raw['status'] as GroupTrip['status']) ?? 'survey-open',
    createdAt:      raw['created_at'] as string,
  }
}

function dbToSurvey(
  tripId: string,
  s: Record<string, unknown>,
): { survey: PrivateSurvey; completed: boolean } {
  return {
    completed: !!s['completed_at'],
    survey: {
      tripId,
      step: 1,
      arrivalDate:             (s['arrival_date'] as string) ?? '',
      arrivalTime:             (s['arrival_time'] as string) ?? '',
      departureDate:           (s['departure_date'] as string) ?? '',
      departureTime:           (s['departure_time'] as string) ?? '',
      joinFullTrip:            (s['join_full_trip'] as boolean) ?? true,
      fixedCommitments:        (s['fixed_commitments'] as string) ?? '',
      scheduleNote:            (s['schedule_note'] as string) ?? '',
      budgetBand:              (s['budget_band'] as string) ?? '',
      budgetFlexibility:       (s['budget_flexibility'] as string) ?? '',
      spendingPriorities:      (s['spending_priorities'] as string[]) ?? [],
      accommodationPreference: (s['accommodation_preference'] as string) ?? '',
      roomPreference:          (s['room_preference'] as string) ?? '',
      bathroomPreference:      (s['bathroom_preference'] as string) ?? '',
      optionalCostPreference:  (s['optional_cost_preference'] as string) ?? '',
      dailyPace:               (s['daily_pace'] as string) ?? '',
      preferredStartTime:      (s['preferred_start_time'] as string) ?? '',
      walkingTolerance:        (s['walking_tolerance'] as string) ?? '',
      transportPreference:     (s['transport_preference'] as string) ?? '',
      freeTimeNeed:            (s['free_time_need'] as string) ?? '',
      groupStylePreference:    (s['group_style_preference'] as string) ?? '',
      dietaryPreferences:      (s['dietary_preferences'] as string) ?? '',
      alcoholPreference:       (s['alcohol_preference'] as string) ?? '',
      accessibilityNeeds:      (s['accessibility_needs'] as string[]) ?? [],
      sensoryPreferences:      (s['sensory_preferences'] as string[]) ?? [],
      interests:               (s['interests'] as string[]) ?? [],
      mustDo:                  (s['must_do'] as string) ?? '',
      cannotDo:                (s['cannot_do'] as string[]) ?? [],
    },
  }
}
