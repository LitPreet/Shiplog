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
  titleLabel: string;
  titlePlaceholder: string;
  showDescription: boolean;
  fields: FormField[];
};

export type NewIdea = { title: string; description?: string; answers?: Record<string, string> };

// Small typed client for our API. Keeping all fetch() calls here means the UI
// never deals with URLs, headers or error parsing.
export function createApi(config: Config) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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

    toggleVote: (id: string) =>
      request<{ voteCount: number; hasVoted: boolean }>(`/api/v1/feedback/${encodeURIComponent(id)}/vote`, {
        method: "POST",
        body: JSON.stringify({ visitorId: getVisitorId() }),
      }),
  };
}

export type Api = ReturnType<typeof createApi>;
