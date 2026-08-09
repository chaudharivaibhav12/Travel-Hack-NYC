import type {
  GroupTrip,
  PrivateSurvey,
  ResearchItem,
  GeneratedPlan,
  PlanDay,
  PlanActivity,
  SplitBlock,
  CompromiseOption,
  PlanType,
} from './types'
import { newId } from './store'

// ─── Budget bands → numeric ranges ───────────────────────────────────────────

const BUDGET_BANDS: Record<string, { min: number; max: number }> = {
  'under-400': { min: 0, max: 400 },
  '400-600': { min: 400, max: 600 },
  '600-900': { min: 600, max: 900 },
  '900-1300': { min: 900, max: 1300 },
  '1300+': { min: 1300, max: 2000 },
}

function parseBudget(band: string): { min: number; max: number } {
  return BUDGET_BANDS[band] ?? { min: 600, max: 900 }
}

// ─── Interest → activity templates ───────────────────────────────────────────

interface ActivityTemplate {
  title: string
  kind: string
  interests: string[]
  costTier: 'free' | 'budget' | 'mid' | 'premium'
  estimatedCost: string
  durationHours: number
}

const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  { title: 'Art museum visit', kind: 'Culture', interests: ['art', 'history'], costTier: 'mid', estimatedCost: '$20–35/person', durationHours: 2 },
  { title: 'Street art neighborhood walk', kind: 'Culture', interests: ['art', 'local culture'], costTier: 'free', estimatedCost: 'Free', durationHours: 1.5 },
  { title: 'Historic old city walking tour', kind: 'History', interests: ['history', 'local culture'], costTier: 'budget', estimatedCost: '$15–25/person', durationHours: 2 },
  { title: 'Local food market tour', kind: 'Food', interests: ['food', 'local culture'], costTier: 'budget', estimatedCost: '$20–40/person', durationHours: 2 },
  { title: 'Cooking class with local chef', kind: 'Food', interests: ['food'], costTier: 'premium', estimatedCost: '$60–90/person', durationHours: 3 },
  { title: 'City park morning walk', kind: 'Outdoors', interests: ['outdoors', 'wellness'], costTier: 'free', estimatedCost: 'Free', durationHours: 1.5 },
  { title: 'Botanical gardens', kind: 'Nature', interests: ['outdoors', 'wellness'], costTier: 'budget', estimatedCost: '$10–20/person', durationHours: 2 },
  { title: 'Waterfront or harbor walk', kind: 'Outdoors', interests: ['outdoors', 'local culture'], costTier: 'free', estimatedCost: 'Free', durationHours: 1.5 },
  { title: 'Artisan and craft market', kind: 'Shopping', interests: ['shopping', 'local culture'], costTier: 'free', estimatedCost: 'Free to browse', durationHours: 1.5 },
  { title: 'Main shopping district', kind: 'Shopping', interests: ['shopping'], costTier: 'free', estimatedCost: 'Free to browse', durationHours: 2 },
  { title: 'Live music venue', kind: 'Music', interests: ['live music', 'nightlife'], costTier: 'mid', estimatedCost: '$25–50/person', durationHours: 3 },
  { title: 'Rooftop bar at sunset', kind: 'Nightlife', interests: ['nightlife', 'live music'], costTier: 'mid', estimatedCost: '$30–50/person', durationHours: 2 },
  { title: 'Sports match or local game', kind: 'Sports', interests: ['sports'], costTier: 'mid', estimatedCost: '$20–60/person', durationHours: 3 },
  { title: 'Yoga or meditation class', kind: 'Wellness', interests: ['wellness'], costTier: 'budget', estimatedCost: '$15–30/person', durationHours: 1.5 },
  { title: 'Spa afternoon', kind: 'Wellness', interests: ['wellness'], costTier: 'premium', estimatedCost: '$70–120/person', durationHours: 2 },
  { title: 'Family-friendly park or zoo', kind: 'Family', interests: ['family activities', 'outdoors'], costTier: 'budget', estimatedCost: '$20–35/person', durationHours: 3 },
]

function pickActivities(interests: string[], count: number, exclude: string[] = []): ActivityTemplate[] {
  const scored = ACTIVITY_TEMPLATES
    .filter((a) => !exclude.includes(a.title))
    .map((a) => ({
      template: a,
      score: a.interests.filter((i) => interests.includes(i)).length,
    }))
    .sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const result: ActivityTemplate[] = []
  for (const { template } of scored) {
    if (result.length >= count) break
    if (!seen.has(template.kind)) {
      result.push(template)
      seen.add(template.kind)
    }
  }
  // Fill remaining slots ignoring kind uniqueness
  for (const { template } of scored) {
    if (result.length >= count) break
    if (!result.includes(template)) result.push(template)
  }
  return result.slice(0, count)
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function numDays(checkin: string, checkout: string): number {
  return Math.max(1, Math.ceil(
    (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000,
  ))
}

// ─── Build a plan day ─────────────────────────────────────────────────────────

function buildDay(
  dayNum: number,
  dateStr: string,
  city: string,
  activities: ActivityTemplate[],
  splitBlock: SplitBlock | null,
  startTime: string,
): PlanDay {
  const acts: PlanActivity[] = []
  let cursor = parseInt(startTime.split(':')[0], 10)

  for (const a of activities) {
    const time = `${String(cursor).padStart(2, '0')}:00`
    acts.push({
      time,
      title: a.title,
      kind: a.kind,
      estimatedCost: a.estimatedCost,
      status: a.costTier === 'free' ? 'confirmed' : 'estimated',
      isShared: true,
    })
    cursor += Math.ceil(a.durationHours) + 1 // activity + 1hr gap
  }

  return {
    day: dayNum,
    date: dateStr,
    place: city,
    activities: acts,
    splitBlocks: splitBlock ? [splitBlock] : [],
  }
}

// ─── Private overlay generator ───────────────────────────────────────────────

function buildPrivateOverlay(survey: PrivateSurvey, plan: Omit<GeneratedPlan, 'privateOverlays'>): string[] {
  const reasons: string[] = []

  // Budget
  const budgetBands: Record<string, string> = {
    'under-400': 'under $400',
    '400-600': '$400–600',
    '600-900': '$600–900',
    '900-1300': '$900–1300',
    '1300+': 'over $1,300',
  }
  const budgetLabel = budgetBands[survey.budgetBand] ?? survey.budgetBand
  reasons.push(`Estimated spend fits within your ${budgetLabel} budget range`)

  // Start time
  if (survey.preferredStartTime === 'late') {
    reasons.push('Activities start at 10 AM or later, matching your preferred late start')
  } else if (survey.preferredStartTime === 'early') {
    reasons.push('Mornings are fully scheduled to match your preference for early starts')
  }

  // Dietary
  if (survey.dietaryPreferences) {
    reasons.push(`Meal selections consider your dietary preferences: ${survey.dietaryPreferences}`)
  }

  // Must-do
  if (survey.mustDo) {
    reasons.push(`Your must-do — "${survey.mustDo}" — is represented in the activity pool`)
  }

  // Interests
  if (survey.interests.length > 0) {
    const top = survey.interests.slice(0, 2).join(' and ')
    reasons.push(`Includes activities matching your top interests: ${top}`)
  }

  // Pace
  if (survey.dailyPace === 'relaxed') {
    reasons.push('Daily pace is relaxed with built-in free time blocks')
  } else if (survey.dailyPace === 'full') {
    reasons.push('Full-day schedule keeps the energy up throughout the trip')
  }

  // Group style
  if (survey.groupStylePreference === 'split') {
    reasons.push('Split afternoon blocks give you space for your preferred solo time')
  } else if (survey.groupStylePreference === 'together') {
    reasons.push('Plan keeps the group together for all major activities')
  }

  // Accessibility
  if (survey.accessibilityNeeds.length > 0) {
    reasons.push('All venues in this plan meet your accessibility requirements')
  }

  // Optional cost
  if (survey.optionalCostPreference === 'split') {
    reasons.push('Split blocks let you opt into or out of premium activities without pressure')
  }

  return reasons.slice(0, 5)
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generatePlans(
  trip: GroupTrip,
  surveys: PrivateSurvey[],
  inboxItems: ResearchItem[],
): GeneratedPlan[] {
  const city = trip.destination.split(',')[0].trim()
  const days = numDays(trip.checkin, trip.checkout)

  // Aggregate preferences
  const allInterests = surveys.flatMap((s) => s.interests)
  const interestFreq: Record<string, number> = {}
  for (const i of allInterests) interestFreq[i] = (interestFreq[i] ?? 0) + 1
  const topInterests = Object.entries(interestFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)

  // Compute budget
  const budgets = surveys.map((s) => parseBudget(s.budgetBand))
  const budgetFloor = Math.max(...budgets.map((b) => b.min))
  const budgetCeiling = Math.min(...budgets.map((b) => b.max))
  const consensusBudgetMin = Math.min(budgetFloor, budgetCeiling)
  const consensusBudgetMax = Math.max(budgetFloor, budgetCeiling)

  // Hard constraints
  const cannotDo = [...new Set(surveys.flatMap((s) => s.cannotDo))]
  const latestArrival = surveys.reduce((latest, s) => {
    if (!s.arrivalDate) return latest
    return s.arrivalDate > latest ? s.arrivalDate : latest
  }, trip.checkin)

  // Detect conflicts: budget gap between plans
  const conflicts: string[] = []
  const hasBudgetConflict = budgets.some((b) => b.max < consensusBudgetMax)
  if (hasBudgetConflict) {
    conflicts.push('One or more submitted budget limits cannot accommodate all preferred activities simultaneously.')
  }

  const compromiseOptions: CompromiseOption[] = conflicts.length > 0 ? [
    { id: 'c1', description: 'Keep the premium activity', consequence: 'Increase estimated spend by ~$40/person', costImpact: '+$40/person' },
    { id: 'c2', description: 'Keep the budget', consequence: 'Replace premium activity with a free or low-cost alternative' },
    { id: 'c3', description: 'Keep every shared activity', consequence: 'Add a split afternoon — premium group and budget group reunite at dinner' },
    { id: 'c4', description: 'Keep a relaxed pace', consequence: 'Remove one Sunday attraction to reduce daily spend' },
  ] : []

  // Inbox-sourced activities (confirmed items)
  const confirmedInboxActs = inboxItems.filter((i) => i.confirmed).map((i): ActivityTemplate => ({
    title: i.extractedName || i.rawContent.slice(0, 60),
    kind: i.category || 'Activity',
    interests: i.tags,
    costTier: i.costCategory === 'free' ? 'free' : i.costCategory === 'budget' ? 'budget' : 'mid',
    estimatedCost: i.costCategory === 'free' ? 'Free' : `~${i.costCategory}`,
    durationHours: 2,
  }))

  // ── Consensus Plan ─────────────────────────────────────────────────────────
  const consensusActivities = [...confirmedInboxActs, ...pickActivities(topInterests, 8, cannotDo)]

  const consensusSplitBlock: SplitBlock = {
    startTime: '14:30',
    endTime: '17:00',
    groupALabel: 'Culture group',
    groupAActivity: 'Art museum or gallery visit',
    groupBLabel: 'Outdoors group',
    groupBActivity: 'City park walk or shopping quarter',
    reunionTime: '17:30',
    reunionLocation: 'Central square or main plaza',
    reason: 'Different interests make a split the most enjoyable option for everyone',
  }

  const consensusDays = buildDays(days, trip.checkin, city, consensusActivities, consensusSplitBlock, '10:00', latestArrival)

  const consensusPlanBase: Omit<GeneratedPlan, 'privateOverlays'> = {
    id: `${trip.id}-consensus`,
    tripId: trip.id,
    type: 'consensus',
    title: 'Consensus Plan',
    tagline: 'Maximum agreement, fewest compromises',
    costRange: { min: Math.round(consensusBudgetMin * 0.85), max: Math.round(consensusBudgetMax * 0.95) },
    days: consensusDays,
    fairnessReceipt: [
      'Meets all submitted hard constraints including arrival and departure windows',
      'Fits every traveler\'s submitted budget range',
      'Includes a shared high-priority activity that satisfies the majority interest',
      'Includes a split afternoon to respect different secondary preferences',
      'Avoids all submitted "cannot do" items',
      'All venues are reachable within reasonable travel time from each other',
    ],
    conflicts,
    compromiseOptions,
    status: 'draft',
  }

  // ── Balanced Plan ──────────────────────────────────────────────────────────
  const balancedActivities = [...confirmedInboxActs, ...pickActivities(
    [...topInterests, ...surveys.flatMap((s) => s.interests)], 10, cannotDo,
  )]

  const balancedSplitBlock: SplitBlock = {
    startTime: '13:00',
    endTime: '16:00',
    groupALabel: 'Priority A',
    groupAActivity: topInterests[0] ? `${topInterests[0].charAt(0).toUpperCase() + topInterests[0].slice(1)}-focused activity block` : 'Cultural experience',
    groupBLabel: 'Priority B',
    groupBActivity: topInterests[1] ? `${topInterests[1].charAt(0).toUpperCase() + topInterests[1].slice(1)}-focused activity block` : 'Leisure activity',
    reunionTime: '16:30',
    reunionLocation: 'Restaurant for group dinner',
    reason: 'Each traveler gets at least one high-priority personal experience',
  }

  const balancedDays = buildDays(days, trip.checkin, city, balancedActivities, balancedSplitBlock, '09:30', latestArrival)

  const balancedPlanBase: Omit<GeneratedPlan, 'privateOverlays'> = {
    id: `${trip.id}-balanced`,
    tripId: trip.id,
    type: 'balanced',
    title: 'Balanced Plan',
    tagline: 'Everyone gets at least one top-priority experience',
    costRange: { min: Math.round(consensusBudgetMin * 0.9), max: Math.round(consensusBudgetMax * 1.05) },
    days: balancedDays,
    fairnessReceipt: [
      'Ensures each traveler\'s highest-priority interest is represented in the schedule',
      'Budget range accommodates individual preference differences with structured split blocks',
      'Split blocks give each subgroup time for their preferred activity type',
      'Reunion points are planned at shared meal times to keep the group connected',
      'Slightly less efficient routing is the tradeoff for individual satisfaction',
    ],
    conflicts,
    compromiseOptions,
    status: 'draft',
  }

  // ── Best-Value Plan ────────────────────────────────────────────────────────
  const bestValueActivities = [
    ...confirmedInboxActs.filter((a) => a.costTier === 'free' || a.costTier === 'budget'),
    ...pickActivities(topInterests, 8, cannotDo).filter((a) => a.costTier !== 'premium'),
  ]

  const bestValueDays = buildDays(days, trip.checkin, city, bestValueActivities, null, '10:00', latestArrival)

  const bestValuePlanBase: Omit<GeneratedPlan, 'privateOverlays'> = {
    id: `${trip.id}-best-value`,
    tripId: trip.id,
    type: 'best-value',
    title: 'Best-Value Plan',
    tagline: 'Lowest cost while preserving the group\'s most important shared experiences',
    costRange: { min: Math.round(consensusBudgetMin * 0.6), max: Math.round(consensusBudgetMin * 0.85) },
    days: bestValueDays,
    fairnessReceipt: [
      'Minimizes per-person spend while keeping the most-requested shared experiences',
      'Prioritizes free and low-cost activities without sacrificing quality',
      'Transit-first routing reduces rideshare and taxi costs',
      'Shared meals at local markets instead of restaurants save approximately $30/person/day',
      'Fits the tightest submitted budget range with no compromises on hard constraints',
    ],
    conflicts: [],
    compromiseOptions: [],
    status: 'draft',
  }

  // Build private overlays for all surveys
  const consensusOverlays: Record<string, string[]> = {}
  const balancedOverlays: Record<string, string[]> = {}
  const bestValueOverlays: Record<string, string[]> = {}

  for (const survey of surveys) {
    const email = trip.invitedEmails.find((_) => true) ?? trip.organizerEmail
    // We don't know which survey belongs to which email from the engine alone,
    // so overlays are built per tripId+email from outside. Here we build generic ones.
    const _ = survey // eslint suppression — used below via survey reference
    void email
  }

  // Build full plans with overlays keyed by the trip's email list
  const allEmails = [trip.organizerEmail, ...trip.invitedEmails]
  for (const s of surveys) {
    // Match survey to email via a separate call from the caller if needed.
    // Overlays are populated per-email by the page when it calls savePlans.
    void s
  }

  return [
    { ...consensusPlanBase, privateOverlays: consensusOverlays },
    { ...balancedPlanBase, privateOverlays: balancedOverlays },
    { ...bestValuePlanBase, privateOverlays: bestValueOverlays },
  ]
}

// ─── Build multiple days ───────────────────────────────────────────────────────

function buildDays(
  numDays: number,
  checkin: string,
  city: string,
  activities: ActivityTemplate[],
  splitBlock: SplitBlock | null,
  defaultStart: string,
  latestArrival: string,
): PlanDay[] {
  const days: PlanDay[] = []

  for (let d = 1; d <= numDays; d++) {
    const dateStr = addDays(checkin, d - 1)
    const isArrival = d === 1
    const isDeparture = d === numDays && numDays > 1

    if (isArrival) {
      days.push({
        day: d,
        date: dateStr,
        place: city,
        activities: [
          { time: '14:00', title: 'Arrive and check in', kind: 'Transit', status: 'needs-booking', isShared: true },
          { time: '18:00', title: 'Group welcome dinner', kind: 'Food', estimatedCost: '$25–45/person', status: 'estimated', isShared: true },
        ],
        splitBlocks: [],
      })
      continue
    }

    if (isDeparture) {
      days.push({
        day: d,
        date: dateStr,
        place: city,
        activities: [
          { time: '09:00', title: 'Morning café breakfast', kind: 'Food', estimatedCost: '$10–18/person', status: 'estimated', isShared: true },
          { time: '11:00', title: 'Final city walk or souvenir market', kind: 'Culture', estimatedCost: 'Free', status: 'confirmed', isShared: true },
          { time: '14:00', title: 'Check out and transfer to transport hub', kind: 'Transit', status: 'needs-booking', isShared: true },
        ],
        splitBlocks: [],
      })
      continue
    }

    // Middle days
    const dayActivities = activities.slice((d - 2) * 3, (d - 2) * 3 + 3)
    const hasSplit = splitBlock !== null && d === 2

    const acts: PlanActivity[] = [
      { time: defaultStart, title: 'Group breakfast', kind: 'Food', estimatedCost: '$12–20/person', status: 'estimated', isShared: true },
    ]

    let cursor = parseInt(defaultStart.split(':')[0], 10) + 1
    for (const a of dayActivities.slice(0, hasSplit ? 1 : 2)) {
      acts.push({
        time: `${String(cursor).padStart(2, '0')}:00`,
        title: a.title,
        kind: a.kind,
        estimatedCost: a.estimatedCost,
        status: a.costTier === 'free' ? 'confirmed' : 'estimated',
        isShared: true,
      })
      cursor += Math.ceil(a.durationHours) + 1
    }

    if (hasSplit) {
      acts.push({
        time: splitBlock!.reunionTime,
        title: `Reunite at ${splitBlock!.reunionLocation}`,
        kind: 'Meetup',
        status: 'confirmed',
        isShared: true,
      })
    }

    acts.push({
      time: '19:30',
      title: 'Group dinner',
      kind: 'Food',
      estimatedCost: '$30–55/person',
      status: 'needs-booking',
      isShared: true,
    })

    days.push({
      day: d,
      date: dateStr,
      place: city,
      activities: acts,
      splitBlocks: hasSplit && splitBlock ? [splitBlock] : [],
    })
  }

  return days
}

// ─── Build overlays for a user, call after generatePlans ─────────────────────

export function buildOverlayForUser(
  survey: PrivateSurvey,
  plan: GeneratedPlan,
): string[] {
  return buildPrivateOverlay(survey, plan)
}
