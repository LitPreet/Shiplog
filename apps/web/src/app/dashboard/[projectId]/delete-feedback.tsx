"use client";

import { useTransition } from "react";
import { deleteFeedback } from "./actions";

// For spam/abuse. Hidden until the row is hovered (always visible on touch).
export function DeleteFeedbackButton({ projectId, feedbackId }: { projectId: string; feedbackId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this feedback and its votes? This can't be undone.")) {
          startTransition(async () => {
            const res = await deleteFeedback(projectId, feedbackId);
            if (!res.ok) alert(res.error);
          });
        }
      }}
      className="text-xs text-muted transition hover:text-red-600 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
