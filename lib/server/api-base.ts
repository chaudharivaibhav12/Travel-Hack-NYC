/**
 * Base URL for the FastAPI service, resolved once so every server-only fetch
 * (trips, preferences, and the /api/* proxy routes) agrees on where the
 * backend lives, rather than each file redefining the same fallback chain.
 */
export const API_BASE =
  process.env.API_BASE ??
  process.env.WEATHER_API_BASE ??
  "http://127.0.0.1:8001";
