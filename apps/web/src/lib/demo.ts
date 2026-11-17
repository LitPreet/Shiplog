// The public demo account. Its login is in the README so anyone (recruiters,
// reviewers) can explore the dashboard. To keep the demo intact for the next
// visitor, it can change idea statuses but not settings, keys or data.
export const DEMO_EMAIL = "demo@shiplog.dev";
export const DEMO_PASSWORD = "demo12345";

export const isDemoUser = (user: { email: string }) => user.email === DEMO_EMAIL;

export const DEMO_READ_ONLY = {
  ok: false as const,
  error: "The demo account is read-only. Create a free account to try this on your own project.",
};
