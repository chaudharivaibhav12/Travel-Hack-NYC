/**
 * Preferences save provider — mirrors lib/providers/trips.ts. One `save` per
 * category; the backend upserts, so saving twice with the same member+trip
 * edits the same row rather than creating a duplicate.
 */

export type PreferencesCategory = "travel" | "stay" | "food" | "activities";

export type SaveResult = { ok: true } | { ok: false; error: string };

export interface PreferencesProvider {
  save(category: PreferencesCategory, payload: Record<string, unknown>): Promise<SaveResult>;
}

class HttpPreferencesProvider implements PreferencesProvider {
  async save(
    category: PreferencesCategory,
    payload: Record<string, unknown>,
  ): Promise<SaveResult> {
    try {
      const response = await fetch(`/api/preferences/${category}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        return {
          ok: false,
          error: typeof body?.error === "string" ? body.error : "Couldn't save that. Try again.",
        };
      }

      return { ok: true };
    } catch {
      return { ok: false, error: "Couldn't reach the server. Try again." };
    }
  }
}

/** Replace this line — and only this line — to swap the preferences transport. */
export const preferencesProvider: PreferencesProvider = new HttpPreferencesProvider();
