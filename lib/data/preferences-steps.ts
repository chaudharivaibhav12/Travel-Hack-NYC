export interface PreferencesStep {
  key: "travel" | "stay" | "food" | "activities";
  label: string;
}

/** Order matters — this is the wizard's fixed Travel → Stay → Food → Activities flow. */
export const PREFERENCES_STEPS: readonly PreferencesStep[] = [
  { key: "travel", label: "Travel" },
  { key: "stay", label: "Stay" },
  { key: "food", label: "Food" },
  { key: "activities", label: "Activities" },
] as const;

export function stepIndex(key: PreferencesStep["key"]): number {
  return PREFERENCES_STEPS.findIndex((step) => step.key === key);
}

/** null on the last step — callers route back to the trip page instead. */
export function nextStepKey(key: PreferencesStep["key"]): PreferencesStep["key"] | null {
  const index = stepIndex(key);
  return index >= 0 && index < PREFERENCES_STEPS.length - 1
    ? PREFERENCES_STEPS[index + 1].key
    : null;
}
