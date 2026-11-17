"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "@/components/icons";
import { createProject } from "./actions";

const input =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15";

export function NewProject({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createProject, undefined);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Project limit reached" : undefined}
        className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-85 disabled:opacity-40"
      >
        <Plus /> New project
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <form
        action={action}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-rise rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">New project</h2>
            <p className="mt-0.5 text-sm text-muted">One project per website or app.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-muted hover:text-foreground">
            <X />
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Project name
            <input name="name" required maxLength={60} autoFocus placeholder="Acme Invoices" className={input} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            <span className="flex justify-between">
              Website <span className="font-normal text-muted">where the widget will run</span>
            </span>
            <input name="origin" placeholder="app.acme.com" className={`${input} font-mono text-sm`} />
          </label>
          {state?.error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
