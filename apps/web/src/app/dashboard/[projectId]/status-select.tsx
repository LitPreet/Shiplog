"use client";

import { useTransition } from "react";
import { updateStatus } from "./actions";

const STATUSES = [
  ["OPEN", "Open"],
  ["PLANNED", "Planned"],
  ["IN_PROGRESS", "In progress"],
  ["DONE", "Done"],
  ["CLOSED", "Closed"],
] as const;

// The only interactive piece of the page, so it's the only Client Component.
// Everything else stays a Server Component (less JS sent to the browser).
export function StatusSelect(props: { projectId: string; feedbackId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Status"
      defaultValue={props.status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => updateStatus(props.projectId, props.feedbackId, next));
      }}
      className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm disabled:opacity-50 dark:border-neutral-700"
    >
      {STATUSES.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
