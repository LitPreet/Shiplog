// Anonymous visitor identity. End-users don't log in to the widget, but we
// still need "has THIS person voted?", so we generate a random ID once and
// keep it in localStorage (scoped to the customer's site).

const STORAGE_KEY = "shiplog:visitorId";
let memoryId: string | null = null;

function randomId(): string {
  // crypto.randomUUID only exists on https/localhost pages.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage can throw (Safari private mode, blocked cookies). Fall back
    // to an in-memory ID so the widget still works for this page view.
    return (memoryId ??= randomId());
  }
}
