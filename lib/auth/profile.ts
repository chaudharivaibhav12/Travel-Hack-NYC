import type { AuthUser } from "@/lib/auth/provider";

export function profileInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function authMethodLabel(method: AuthUser["method"]): string {
  return method === "google" ? "Google" : "Email and password";
}
