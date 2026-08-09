"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js so the browser offers the install prompt.
 * Dev is skipped — an active worker in dev makes hot reload behave oddly and
 * gains nothing, since installability only matters in the built app.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a nice-to-have; never let it surface an error (§12).
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
