"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "@/components/icons";
import { login, signup } from "./actions";

const input =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  const isSignup = mode === "signup";

  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      {isSignup && (
        <Field label="Name">
          <input name="name" autoComplete="name" required maxLength={80} defaultValue={state?.name} placeholder="Ada Lovelace" className={input} />
        </Field>
      )}
      <Field label="Email">
        <input name="email" type="email" autoComplete="email" required defaultValue={state?.email} placeholder="you@company.com" className={input} />
      </Field>
      <Field label="Password" hint={isSignup ? "At least 8 characters" : undefined}>
        <input
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : undefined}
          className={input}
        />
      </Field>

      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        {!pending && <ArrowRight />}
      </button>

      <p className="text-center text-sm text-muted">
        {isSignup ? "Already have an account? " : "New to Shiplog? "}
        <Link
          href={`${isSignup ? "/login" : "/signup"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span className="flex justify-between">
        {label}
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
