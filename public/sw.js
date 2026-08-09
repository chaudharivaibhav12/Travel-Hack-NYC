/**
 * Installability only.
 *
 * MasterPrompt.md §11 says "PWA manifest + icons if time allows; NO OFFLINE
 * SYNC". A service worker with a fetch handler is required for the install
 * prompt to appear, so this one exists and does nothing but pass requests
 * straight through. Do not add caching here — a stale cached response during a
 * live demo is exactly the failure mode §12 is written to prevent.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty: no respondWith, so the network handles everything.
});
