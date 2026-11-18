import type { ProviderId } from "@/lib/oauth";

const MESSAGES: Record<string, string> = {
  oauth_cancelled: "Sign-in was cancelled.",
  oauth_state: "That sign-in link expired or was already used. Please try again.",
  oauth_unverified_email: "Your account's email isn't verified with that provider. Verify it there, then try again.",
  oauth_unavailable: "That sign-in option isn't available right now.",
  oauth_rate_limited: "Too many sign-in attempts. Wait a few minutes and try again.",
  oauth_failed: "We couldn't complete sign-in with that provider. Please try again.",
};

export const oauthErrorMessage = (code?: string) => (code ? MESSAGES[code] : undefined);

const ICONS: Record<ProviderId, React.ReactNode> = {
  github: (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.57-5.15 3.57-8.73z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.27a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.6l4 3.1C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  ),
};

// Plain links (not buttons): the flow starts with a normal top-level navigation
// to our /api/auth/:provider route, which redirects to the provider.
export function SocialButtons({ providers, next }: { providers: { id: ProviderId; label: string }[]; next?: string }) {
  if (providers.length === 0) return null;
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="mb-5 flex flex-col gap-2.5">
      {providers.map((p) => (
        <a
          key={p.id}
          href={`/api/auth/${p.id}${query}`}
          className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:border-foreground/30 hover:bg-subtle"
        >
          {ICONS[p.id]}
          Continue with {p.label}
        </a>
      ))}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or with email
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
