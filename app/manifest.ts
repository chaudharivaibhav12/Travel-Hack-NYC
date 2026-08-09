import type { MetadataRoute } from "next";

/**
 * DESIGN.md §11 (PWA requirements).
 * background_color is Snow, theme_color is Alpine Blue — the two hexes the
 * browser chrome needs before any CSS has loaded, which is why they are literal
 * here rather than tokens.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sage Adventurer",
    short_name: "Sage",
    description:
      "Most travel apps know where you want to go. Sage learns how you travel.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F7F5",
    theme_color: "#294C60",
    categories: ["travel", "lifestyle", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
