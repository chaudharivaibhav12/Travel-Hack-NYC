export type TripStatus = 'setup' | 'survey-open' | 'generating' | 'reviewing' | 'locked'
export type PlanType = 'consensus' | 'balanced' | 'best-value'
export type FeedbackChoice = 'happy' | 'acceptable' | 'breaks-must-have'
export type SurveyStatus = 'not-started' | 'in-progress' | 'complete'
export type Confidence = 'high' | 'medium' | 'low'
export type ActivityStatus = 'confirmed' | 'estimated' | 'needs-booking' | 'weather-sensitive'
export type AccomFitLabel = 'Best value' | 'Best location' | 'Best comfort'

export interface GroupTrip {
  id: string
  title: string
  destination: string
  checkin: string  // YYYY-MM-DD
  checkout: string // YYYY-MM-DD
  organizerEmail: string
  invitedEmails: string[]
  status: TripStatus
  lockedPlanId?: string
  createdAt: string
}

export interface PrivateSurvey {
  tripId: string
  step: number
  completedAt?: string
  // B2: Availability
  arrivalDate: string
  arrivalTime: string
  departureDate: string
  departureTime: string
  joinFullTrip: boolean
  fixedCommitments: string
  scheduleNote: string
  // B3: Budget
  budgetBand: string
  budgetFlexibility: string
  spendingPriorities: string[]
  accommodationPreference: string
  roomPreference: string
  bathroomPreference: string
  optionalCostPreference: string
  // B4: Pace & Logistics
  dailyPace: string
  preferredStartTime: string
  walkingTolerance: string
  transportPreference: string
  freeTimeNeed: string
  groupStylePreference: string
  // B5: Food, Accessibility & Comfort
  dietaryPreferences: string
  alcoholPreference: string
  accessibilityNeeds: string[]
  sensoryPreferences: string[]
  // B6: Interests, Must-Dos & Avoids
  interests: string[]
  mustDo: string
  cannotDo: string[]
}

export interface ResearchItem {
  id: string
  tripId: string
  addedByEmail: string
  addedByName: string
  type: 'text' | 'link' | 'place'
  rawContent: string
  extractedName: string
  category: string
  neighborhood: string
  costCategory: string
  tags: string[]
  confidence: Confidence
  confirmed: boolean
  createdAt: string
}

export interface SplitBlock {
  startTime: string
  endTime: string
  groupALabel: string
  groupAActivity: string
  groupBLabel: string
  groupBActivity: string
  reunionTime: string
  reunionLocation: string
  reason: string
}

export interface PlanActivity {
  time: string
  title: string
  kind: string
  location?: string
  estimatedCost?: string
  status: ActivityStatus
  isShared: boolean
}

export interface PlanDay {
  day: number
  date: string
  place: string
  activities: PlanActivity[]
  splitBlocks: SplitBlock[]
}

export interface CompromiseOption {
  id: string
  description: string
  consequence: string
  costImpact?: string
}

export interface GeneratedPlan {
  id: string
  tripId: string
  type: PlanType
  title: string
  tagline: string
  costRange: { min: number; max: number }
  days: PlanDay[]
  fairnessReceipt: string[]
  // email -> personalized reasons shown only to that user
  privateOverlays: Record<string, string[]>
  conflicts: string[]
  compromiseOptions: CompromiseOption[]
  status: 'draft' | 'locked'
  lockedAt?: string
}

export interface PlanFeedback {
  tripId: string
  planId: string
  choice: FeedbackChoice
  note: string
  submittedAt: string
}

export interface ChangeEvent {
  id: string
  label: string
  description: string
  affectedDay: number
  resolution: string
}
