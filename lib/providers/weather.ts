/**
 * Weather provider interface — the only weather surface the UI knows about.
 *
 * Mirrors the `AuthProvider` pattern in `lib/auth/provider.ts`: swapping the
 * implementation is a one-line change at the bottom of this file, and no
 * component imports the transport directly.
 *
 * MasterPrompt §12: weather never breaks a screen. `getForecast` resolves to
 * `null` when the service is unreachable — callers omit the section entirely
 * rather than rendering an error or an empty panel.
 *
 * Owned by D4 per §7.
 */

export interface ForecastDay {
  /** YYYY-MM-DD */
  date: string;
  temperatureMax: number | null;
  temperatureMin: number | null;
  /** ISO timestamp, or null when the provider omitted it. */
  sunrise: string | null;
  sunset: string | null;
}

export interface Forecast {
  days: ForecastDay[];
  /** True when served from a cached or seeded payload rather than live data. */
  stale: boolean;
}

export interface ForecastQuery {
  latitude: number;
  longitude: number;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
}

export interface WeatherProvider {
  /** Resolves to `null` when weather is unavailable — never throws. */
  getForecast(query: ForecastQuery): Promise<Forecast | null>;
}

/* -------------------------------------------------------------------------- */

/**
 * Shape returned by `GET /api/weather`, itself proxying FastAPI's `/weather`.
 * `daily` is a list of per-day rows — see `_serialize_response` in
 * `backend/services/weather.py`.
 */
interface WeatherApiResponse {
  daily?: {
    date?: string;
    temperature_2m_max?: number | null;
    temperature_2m_min?: number | null;
    sunrise?: string | null;
    sunset?: string | null;
  }[];
  stale?: boolean;
}

function toForecast(payload: WeatherApiResponse): Forecast | null {
  const daily = payload.daily;
  if (!daily || daily.length === 0) return null;

  const days: ForecastDay[] = daily
    .filter((row): row is { date: string } & typeof row => Boolean(row.date))
    .map((row) => ({
      date: row.date,
      temperatureMax: row.temperature_2m_max ?? null,
      temperatureMin: row.temperature_2m_min ?? null,
      sunrise: row.sunrise ?? null,
      sunset: row.sunset ?? null,
    }));

  if (days.length === 0) return null;

  return { days, stale: payload.stale ?? false };
}

class HttpWeatherProvider implements WeatherProvider {
  async getForecast(query: ForecastQuery): Promise<Forecast | null> {
    const params = new URLSearchParams({
      latitude: String(query.latitude),
      longitude: String(query.longitude),
      start_date: query.startDate,
      end_date: query.endDate,
    });

    try {
      const response = await fetch(`/api/weather?${params}`);
      if (!response.ok) return null;
      return toForecast((await response.json()) as WeatherApiResponse);
    } catch {
      // §12: unavailable weather is a missing section, not an error state.
      return null;
    }
  }
}

/** Replace this line — and only this line — to swap the weather transport. */
export const weatherProvider: WeatherProvider = new HttpWeatherProvider();
