"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { GoogleMark } from "@/components/auth/google-mark";
import { useAuth } from "@/components/auth/auth-context";

type Pending = "none" | "password" | "google";

export function LoginForm() {
  const { signInWithPassword, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("error_description")?.replaceAll("+", " ") ?? null,
  );
  const [pending, setPending] = useState<Pending>("none");

  const destination = searchParams.get("next") ?? "/";

  function completeSignIn() {
    router.replace(destination);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("password");

    const result = await signInWithPassword(identifier, password);

    if (result.ok) {
      completeSignIn();
      return;
    }

    setError(result.error);
    setPending("none");
  }

  async function handleGoogle() {
    setError(null);
    setPending("google");

    const result = await signInWithGoogle();

    if (result.ok) {
      completeSignIn();
      return;
    }

    setError(result.error);
    setPending("none");
  }

  const busy = pending !== "none";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field
        label="Email or username"
        name="identifier"
        type="text"
        autoComplete="username"
        placeholder="admin"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        disabled={busy}
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={busy}
      />

      {/* Reserved height so the card never jumps when an error appears. */}
      <p
        role="alert"
        aria-live="polite"
        className="min-h-[18px] text-[12.5px] leading-[18px] text-destructive"
      >
        {error}
      </p>

      <Button type="submit" fullWidth disabled={busy}>
        {pending === "password" ? "Signing in…" : "Sign in"}
      </Button>

      <div className="relative py-1 text-center">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border"
        />
        <span className="relative bg-card px-3 text-xs text-muted-foreground">
          or
        </span>
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        onClick={handleGoogle}
        disabled={busy}
      >
        <GoogleMark />
        {pending === "google" ? "Connecting…" : "Continue with Google"}
      </Button>
    </form>
  );
}
