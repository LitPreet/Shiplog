"use client";

import { useActionState, useState, useTransition } from "react";
import { CopyButton } from "@/components/copy-button";
import { Globe, Plus, X } from "@/components/icons";
import { addOrigin, deleteProject, removeOrigin, renameProject, rotateKey, setActive } from "../actions";

// Actions return { ok: false, error } instead of throwing (e.g. demo account).
async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
  const res = await action();
  if (!res.ok && res.error) alert(res.error);
}

const card = "rounded-2xl border border-border bg-card p-5";
const input =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15";
const btn = "rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium transition hover:border-foreground/30 disabled:opacity-50";

export function OriginsCard({ projectId, origins, max }: { projectId: string; origins: string[]; max: number }) {
  const [state, action, pending] = useActionState(addOrigin.bind(null, projectId), undefined);
  const [removing, startTransition] = useTransition();

  return (
    <div className={card}>
      <h3 className="text-sm font-semibold">Allowed websites</h3>
      <ul className="mt-3 flex flex-col gap-1.5">
        {origins.length === 0 && <li className="text-sm text-muted">None yet. The widget won&apos;t load anywhere.</li>}
        {origins.map((o) => (
          <li key={o} className="flex items-center justify-between gap-2 rounded-lg bg-subtle px-3 py-2 font-mono text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <Globe className="shrink-0 text-muted" />
              <span className="truncate">{o}</span>
            </span>
            <button
              type="button"
              disabled={removing}
              aria-label={`Remove ${o}`}
              onClick={() => startTransition(() => run(() => removeOrigin(projectId, o)))}
              className="text-muted transition hover:text-red-600"
            >
              <X />
            </button>
          </li>
        ))}
      </ul>
      {origins.length < max && (
        <form action={action} className="mt-3 flex gap-2">
          <input name="origin" required placeholder="app.acme.com" className={`${input} font-mono`} />
          <button disabled={pending} className={`${btn} inline-flex shrink-0 items-center gap-1`}>
            <Plus /> Add
          </button>
        </form>
      )}
      {state && !state.ok && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <p className="mt-3 text-xs text-muted">
        Testing locally? Add <code className="font-mono">http://localhost:5173</code>.
      </p>
    </div>
  );
}

export function KeyCard({ projectId, publicKey }: { projectId: string; publicKey: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className={card}>
      <h3 className="text-sm font-semibold">Public key</h3>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-subtle px-3 py-2">
        <code className="truncate font-mono text-xs">{publicKey}</code>
        <CopyButton text={publicKey} />
      </div>
      <p className="mt-3 text-sm text-muted">
        If someone is abusing your key, rotate it. The old key stops working immediately and you&apos;ll need to update your snippet.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Rotate the key? The widget stops working until you paste the new snippet.")) {
            startTransition(() => run(() => rotateKey(projectId)));
          }
        }}
        className={`${btn} mt-3`}
      >
        {pending ? "Rotating…" : "Rotate key"}
      </button>
    </div>
  );
}

export function GeneralSettings({ projectId, name, isActive }: { projectId: string; name: string; isActive: boolean }) {
  const [state, action, saving] = useActionState(renameProject.bind(null, projectId), undefined);
  const [toggling, startTransition] = useTransition();

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <form action={action} className={card}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Project name
          <input name="name" defaultValue={name} required maxLength={60} className={`${input} font-normal`} />
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button disabled={saving} className={btn}>
            {saving ? "Saving…" : "Save"}
          </button>
          {state && (state.ok ? <span className="text-sm text-done">Saved</span> : <span className="text-sm text-red-600">{state.error}</span>)}
        </div>
      </form>
      <div className={`${card} flex items-start justify-between gap-4`}>
        <div>
          <h3 className="text-sm font-semibold">Widget is {isActive ? "live" : "paused"}</h3>
          <p className="mt-1 text-sm text-muted">
            Pausing hides the widget on your site and rejects all API requests. Your data stays.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label="Widget live"
          disabled={toggling}
          onClick={() => startTransition(() => run(() => setActive(projectId, !isActive)))}
          className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${isActive ? "bg-done" : "bg-border"}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${isActive ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
    </div>
  );
}

export function DangerZone({ projectId, name }: { projectId: string; name: string }) {
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
      <h3 className="text-sm font-semibold">Delete this project</h3>
      <p className="mt-1 text-sm text-muted">
        Permanently deletes all feedback and votes. Type <strong className="text-foreground">{name}</strong> to confirm.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={name} className={`${input} sm:max-w-xs`} />
        <button
          type="button"
          disabled={confirmText !== name || pending}
          onClick={() => startTransition(() => run(() => deleteProject(projectId)))}
          className="rounded-xl bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
        >
          {pending ? "Deleting…" : "Delete project"}
        </button>
      </div>
    </div>
  );
}
