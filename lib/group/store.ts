import type {
  GroupTrip,
  PrivateSurvey,
  ResearchItem,
  GeneratedPlan,
  PlanFeedback,
} from './types'

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TRIPS_KEY = 'group_trips_v1'
const surveyKey = (tripId: string, email: string) => `survey_v1_${tripId}_${email}`
const surveyStatusKey = (tripId: string) => `survey_status_v1_${tripId}`
const inboxKey = (tripId: string) => `inbox_v1_${tripId}`
const plansKey = (tripId: string) => `plans_v1_${tripId}`
const feedbackKey = (tripId: string, email: string) => `feedback_v1_${tripId}_${email}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export function getAllTrips(): GroupTrip[] {
  return readJSON<GroupTrip[]>(TRIPS_KEY) ?? []
}

export function getTripsForUser(email: string): GroupTrip[] {
  return getAllTrips().filter(
    (t) => t.organizerEmail === email || t.invitedEmails.includes(email),
  )
}

export function getTrip(id: string): GroupTrip | null {
  return getAllTrips().find((t) => t.id === id) ?? null
}

export function createTrip(trip: GroupTrip): void {
  const all = getAllTrips()
  writeJSON(TRIPS_KEY, [...all, trip])
}

export function updateTrip(id: string, updates: Partial<GroupTrip>): void {
  const all = getAllTrips()
  writeJSON(
    TRIPS_KEY,
    all.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  )
}

export function deleteTrip(id: string): void {
  const all = getAllTrips()
  writeJSON(TRIPS_KEY, all.filter((t) => t.id !== id))
  removeItem(inboxKey(id))
  removeItem(plansKey(id))
}

// ─── Survey ───────────────────────────────────────────────────────────────────

export function getSurvey(tripId: string, email: string): PrivateSurvey | null {
  return readJSON<PrivateSurvey>(surveyKey(tripId, email))
}

export function saveSurvey(survey: PrivateSurvey, email: string): void {
  writeJSON(surveyKey(survey.tripId, email), survey)
}

export function markSurveyComplete(tripId: string, email: string): void {
  const statuses = readJSON<Record<string, string>>(surveyStatusKey(tripId)) ?? {}
  statuses[email] = 'complete'
  writeJSON(surveyStatusKey(tripId), statuses)
}

export function getSurveyStatuses(tripId: string): Record<string, string> {
  return readJSON<Record<string, string>>(surveyStatusKey(tripId)) ?? {}
}

export function isSurveyComplete(tripId: string, email: string): boolean {
  const statuses = getSurveyStatuses(tripId)
  return statuses[email] === 'complete'
}

export function getAllSurveysForTrip(trip: GroupTrip): PrivateSurvey[] {
  const emails = [trip.organizerEmail, ...trip.invitedEmails]
  const statuses = getSurveyStatuses(trip.id)
  return emails
    .filter((e) => statuses[e] === 'complete')
    .map((e) => getSurvey(trip.id, e))
    .filter(Boolean) as PrivateSurvey[]
}

// ─── Research Inbox ───────────────────────────────────────────────────────────

export function getInbox(tripId: string): ResearchItem[] {
  return readJSON<ResearchItem[]>(inboxKey(tripId)) ?? []
}

export function addInboxItem(item: ResearchItem): void {
  const items = getInbox(item.tripId)
  writeJSON(inboxKey(item.tripId), [item, ...items])
}

export function updateInboxItem(
  tripId: string,
  id: string,
  updates: Partial<ResearchItem>,
): void {
  const items = getInbox(tripId)
  writeJSON(
    inboxKey(tripId),
    items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
  )
}

export function removeInboxItem(tripId: string, id: string): void {
  const items = getInbox(tripId)
  writeJSON(inboxKey(tripId), items.filter((i) => i.id !== id))
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export function getPlans(tripId: string): GeneratedPlan[] {
  return readJSON<GeneratedPlan[]>(plansKey(tripId)) ?? []
}

export function savePlans(tripId: string, plans: GeneratedPlan[]): void {
  writeJSON(plansKey(tripId), plans)
}

export function getPlan(tripId: string, planId: string): GeneratedPlan | null {
  return getPlans(tripId).find((p) => p.id === planId) ?? null
}

export function updatePlan(
  tripId: string,
  planId: string,
  updates: Partial<GeneratedPlan>,
): void {
  const plans = getPlans(tripId)
  writeJSON(
    plansKey(tripId),
    plans.map((p) => (p.id === planId ? { ...p, ...updates } : p)),
  )
}

// ─── Feedback (private per user per plan) ────────────────────────────────────

export function getMyFeedback(
  tripId: string,
  email: string,
): Record<string, PlanFeedback> {
  return readJSON<Record<string, PlanFeedback>>(feedbackKey(tripId, email)) ?? {}
}

export function saveFeedback(
  tripId: string,
  email: string,
  planId: string,
  feedback: PlanFeedback,
): void {
  const existing = getMyFeedback(tripId, email)
  writeJSON(feedbackKey(tripId, email), { ...existing, [planId]: feedback })
}

export function getAggregateFeedback(
  tripId: string,
  allEmails: string[],
  planId: string,
): { happy: number; acceptable: number; breaksMustHave: number } {
  const result = { happy: 0, acceptable: 0, breaksMustHave: 0 }
  for (const email of allEmails) {
    const fb = getMyFeedback(tripId, email)[planId]
    if (!fb) continue
    if (fb.choice === 'happy') result.happy++
    else if (fb.choice === 'acceptable') result.acceptable++
    else result.breaksMustHave++
  }
  return result
}

// ─── Utility: generate unique ID ─────────────────────────────────────────────

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
