"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { GoogleMark } from "@/components/auth/google-mark";
import { useAuth } from "@/components/auth/auth-context";
import { validateSignUp } from "@/lib/auth/validation";

type Pending = "none" | "password" | "google";
type Mode = "signin" | "signup";

export function LoginForm() {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("error_description")?.replaceAll("+", " ") ?? null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>("none");

  const destination = searchParams.get("next") ?? "/";

  function completeSignIn() {
    router.replace(destination);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending("password");

    if (mode === "signup") {
      const validationError = validateSignUp({
        email: identifier,
        password,
        confirmPassword,
      });
      if (validationError) {
        setError(validationError);
        setPending("none");
        return;
      }

      const result = await signUpWithPassword(identifier, password);
      if (!result.ok) {
        setError(result.error);
        setPending("none");
        return;
      }
      if (result.status === "signed_in") {
        completeSignIn();
        return;
      }

      setMessage(`Check ${result.email} for a confirmation link, then return here to sign in.`);
      setPending("none");
      return;
    }

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
    setMessage(null);
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

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field
        label={mode === "signup" ? "Email address" : "Email or username"}
        name="identifier"
        type={mode === "signup" ? "email" : "text"}
        autoComplete={mode === "signup" ? "email" : "username"}
        placeholder={mode === "signup" ? "you@example.com" : "admin"}
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        disabled={busy}
      />

      {mode === "signup" ? (
        <Field
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={busy}
        />
      ) : null}

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
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

      {message ? (
        <p role="status" className="text-sm leading-5 text-primary">
          {message}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={busy}>
        {pending === "password"
          ? mode === "signup"
            ? "Creating account…"
            : "Signing in…"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
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

      <p className="text-center text-sm text-muted-foreground">
        {mode === "signin" ? "New to Sage?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}
          disabled={busy}
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
