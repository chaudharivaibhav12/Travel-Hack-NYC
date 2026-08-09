"use client";

import { AtSign, Fingerprint, KeyRound } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { Card } from "@/components/ui/card";
import { authMethodLabel, profileInitials } from "@/lib/auth/profile";

export function AccountProfile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Your account details are unavailable. Sign in again to refresh them.
      </Card>
    );
  }

  const details = [
    { label: "Email", value: user.email, icon: AtSign },
    { label: "Sign-in method", value: authMethodLabel(user.method), icon: KeyRound },
    { label: "Account ID", value: user.id, icon: Fingerprint },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <Card className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <div className="grid size-20 shrink-0 place-items-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
          {profileInitials(user.name)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Signed-in traveler
          </p>
          <h2 className="mt-1 truncate font-display text-2xl font-semibold text-foreground">
            {user.name}
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </Card>

      <Card className="divide-y divide-border overflow-hidden">
        {details.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-start gap-3 px-5 py-4">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-muted text-primary">
              <Icon size={16} strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-0.5 break-all text-sm font-medium text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
