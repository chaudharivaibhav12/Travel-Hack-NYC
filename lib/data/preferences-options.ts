import type { ChipOption } from "@/components/ui/chip-group";

/**
 * The option lists behind every preferences form's chips, in one place so
 * the read-only plan summary (lib/server/plan.ts consumers) can turn a
 * stored value like "free_cancellation" back into "Free cancellation"
 * without duplicating these lists a third time.
 */

export const DEPARTURE_TIME_OPTIONS: readonly ChipOption[] = [
  { value: "any", label: "Any time" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

export const FLEXIBILITY_OPTIONS: readonly ChipOption[] = [
  { value: "exact", label: "Exact dates" },
  { value: "1day", label: "±1 day" },
  { value: "3days", label: "±3 days" },
  { value: "flexible", label: "Flexible" },
];

export const PROPERTY_TYPE_OPTIONS: readonly ChipOption[] = [
  { value: "hotel", label: "Hotel" },
  { value: "apartment", label: "Apartment" },
  { value: "hostel", label: "Hostel" },
  { value: "villa", label: "Villa" },
  { value: "cabin", label: "Cabin" },
];

export const VIBE_OPTIONS: readonly ChipOption[] = [
  { value: "modern", label: "Modern" },
  { value: "cozy", label: "Cozy" },
  { value: "boutique", label: "Boutique" },
  { value: "budget", label: "Budget" },
  { value: "luxury", label: "Luxury" },
];

export const NEEDS_OPTIONS: readonly ChipOption[] = [
  { value: "private_room", label: "Private room" },
  { value: "free_cancellation", label: "Free cancellation" },
  { value: "near_transit", label: "Near transit" },
  { value: "good_reviews", label: "Good reviews" },
];

export const CUISINE_OPTIONS: readonly ChipOption[] = [
  { value: "japanese", label: "Japanese" },
  { value: "italian", label: "Italian" },
  { value: "street_food", label: "Street food" },
  { value: "korean", label: "Korean" },
  { value: "mexican", label: "Mexican" },
  { value: "indian", label: "Indian" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "american", label: "American" },
];

export const DIETARY_OPTIONS: readonly ChipOption[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "none", label: "No restrictions" },
];

export const MEAL_BUDGET_OPTIONS: readonly ChipOption[] = [
  { value: "budget", label: "Budget" },
  { value: "mid", label: "Mid-range" },
  { value: "splurge", label: "Splurge" },
];

export const INTEREST_OPTIONS: readonly ChipOption[] = [
  { value: "markets", label: "Markets" },
  { value: "museums", label: "Museums" },
  { value: "nightlife", label: "Nightlife" },
  { value: "nature", label: "Nature" },
  { value: "shopping", label: "Shopping" },
  { value: "hidden_gems", label: "Hidden gems" },
  { value: "architecture", label: "Architecture" },
  { value: "beaches", label: "Beaches" },
];

export const PACE_OPTIONS: readonly ChipOption[] = [
  { value: "relaxed", label: "Relaxed" },
  { value: "moderate", label: "Moderate" },
  { value: "packed", label: "Packed" },
];

/** Falls back to the raw value if it's somehow not in the option list. */
export function optionLabel(options: readonly ChipOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
