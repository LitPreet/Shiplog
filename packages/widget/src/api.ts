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
    list: () =>
      request<{ items: FeedbackItem[] }>(`/api/v1/feedback?visitorId=${encodeURIComponent(getVisitorId())}`),

    create: (input: { title: string; description?: string }) =>
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
