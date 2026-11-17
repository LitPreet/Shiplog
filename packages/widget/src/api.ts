import type { Config } from "./config";
import { getVisitorId } from "./visitor";

export type FeedbackStatus = "OPEN" | "PLANNED" | "IN_PROGRESS" | "DONE" | "CLOSED";

export type FeedbackItem = {
  id: string;
  title: string;
  description: string | null;
  status: FeedbackStatus;
  voteCount: number;
  hasVoted: boolean;
  createdAt: string;
};

// Widget settings the owner edits in the dashboard (GET /api/v1/config).
export type FieldType = "text" | "textarea" | "select" | "email" | "number";
export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
};
export type WidgetConfig = {
  title: string;
  subtitle: string;
  launcherText: string;
  accentColor: string;
  theme: "light" | "dark" | "auto";
  titleLabel: string;
  titlePlaceholder: string;
  showDescription: boolean;
  fields: FormField[];
};

// An existing idea that looks like what the visitor is writing.
export type SimilarIdea = { id: string; title: string; voteCount: number; status: FeedbackStatus; hasVoted: boolean };

export type NewIdea = { title: string; description?: string; answers?: Record<string, string> };

// Small typed client for our API. Keeping all fetch() calls here means the UI
// never deals with URLs, headers or error parsing.
export function createApi(config: Config) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    // (init.signal lets callers cancel stale requests, e.g. while typing.)
    const res = await fetch(config.apiBase + path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Shiplog-Key": config.key,
        ...init.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data as T;
  }

  return {
    config: () => request<WidgetConfig>("/api/v1/config"),

    list: () =>
      request<{ items: FeedbackItem[] }>(`/api/v1/feedback?visitorId=${encodeURIComponent(getVisitorId())}`),

    create: (input: NewIdea) =>
      request<{ item: FeedbackItem }>("/api/v1/feedback", {
        method: "POST",
        body: JSON.stringify({ ...input, visitorId: getVisitorId(), pageUrl: location.href }),
      }),

    // Trigram matches while typing (no AI). Pass a signal to cancel stale calls.
    similar: (q: string, signal?: AbortSignal) =>
      request<{ items: SimilarIdea[] }>(
        `/api/v1/feedback/similar?q=${encodeURIComponent(q)}&visitorId=${encodeURIComponent(getVisitorId())}`,
        { signal },
      ),

    // AI duplicate check before posting. Never throws for AI trouble (server
    // falls back), but the client still caps the wait.
    check: (input: { title: string; description?: string }) =>
      request<{ duplicates: SimilarIdea[]; source: string }>("/api/v1/feedback/check", {
        method: "POST",
        body: JSON.stringify({ ...input, visitorId: getVisitorId() }),
        signal: AbortSignal.timeout(7000),
      }),

    toggleVote: (id: string) =>
      request<{ voteCount: number; hasVoted: boolean }>(`/api/v1/feedback/${encodeURIComponent(id)}/vote`, {
        method: "POST",
        body: JSON.stringify({ visitorId: getVisitorId() }),
      }),
  };
}

export type Api = ReturnType<typeof createApi>;
