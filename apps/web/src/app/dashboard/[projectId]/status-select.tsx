"use client";

import { useState, useTransition } from "react";
import { STATUSES, STATUS_META, isStatus, type Status } from "@/lib/status";
import { updateStatus } from "./actions";

// The only interactive piece of the page, so it's the only Client Component.
// Everything else stays a Server Component (less JS sent to the browser).
// Styled as a status pill; a native <select> is layered on top so keyboard,
// screen readers and mobile pickers all work for free.
export function StatusSelect(props: { projectId: string; feedbackId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(isStatus(props.status) ? props.status : "OPEN");
  const meta = STATUS_META[status];

  return (
    <span
      className={`relative inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold transition hover:border-foreground/25 ${meta.text} ${pending ? "opacity-60" : ""}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot} ${pending ? "animate-pulse" : ""}`} />
      {meta.label}
      <svg viewBox="0 0 12 12" className="size-3 opacity-60" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <path d="M3 4.5l3 3 3-3" />
      </svg>
      <select
        aria-label="Status"
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          if (!isStatus(next)) return;
          const prev = status;
          setStatus(next);
          startTransition(async () => {
            try {
              await updateStatus(props.projectId, props.feedbackId, next);
            } catch {
              setStatus(prev);
            }
          });
        }}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-wait"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>
    </span>
  );
}
