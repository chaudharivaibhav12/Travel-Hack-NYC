/**
 * Static demo trip for the UI pass. Numbers follow MasterPrompt.md §8's
 * budget script: $2,000 total for 6 days.
 *
 * This file is a UI placeholder. When D2's engine and D1's Supabase data land,
 * every screen reads from those instead and this file is deleted — not extended.
 */

export const DEMO_TRIP = {
  id: "kazbegi-2026",
  title: "Kazbegi Roadtrip",
  /** Pre-formatted with an en dash, per DESIGN.md §9. */
  dateRange: "May 20 – May 26",
  duration: "6 Days",
  stats: [
    { value: 6, label: "Days" },
    { value: 3, label: "Destinations" },
    { value: 8, label: "Activities" },
    { value: 3, label: "Travelers" },
  ],
} as const;

export const DEMO_BUDGET = {
  total: 2000,
  /** MasterPrompt §8: accommodation 560, transport 520, food 380, activities 300, misc 140. */
  categories: [
    { key: "accommodation", label: "Accommodation", planned: 600, spent: 560 },
    { key: "transportation", label: "Transportation", planned: 450, spent: 520 },
    { key: "food", label: "Food", planned: 400, spent: 380 },
    { key: "activities", label: "Activities", planned: 400, spent: 300 },
    { key: "misc", label: "Misc", planned: 150, spent: 140 },
  ],
} as const;

export const DEMO_BUDGET_SPENT = DEMO_BUDGET.categories.reduce(
  (sum, category) => sum + category.spent,
  0,
);
