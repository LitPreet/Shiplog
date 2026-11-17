// One place that knows how each feedback status looks, shared by the
// dashboard and the marketing page.

export const STATUSES = ["OPEN", "PLANNED", "IN_PROGRESS", "DONE", "CLOSED"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<Status, { label: string; dot: string; text: string; bar: string }> = {
  OPEN: { label: "Open", dot: "bg-muted", text: "text-muted", bar: "bg-muted/40" },
  PLANNED: { label: "Planned", dot: "bg-planned", text: "text-planned", bar: "bg-planned" },
  IN_PROGRESS: { label: "In progress", dot: "bg-progress", text: "text-progress", bar: "bg-progress" },
  DONE: { label: "Shipped", dot: "bg-done", text: "text-done", bar: "bg-done" },
  CLOSED: { label: "Closed", dot: "bg-closed", text: "text-closed", bar: "bg-closed/50" },
};

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}
