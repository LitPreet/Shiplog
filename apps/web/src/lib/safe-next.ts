// Only allow redirects to our own pages after login. Without this,
// /login?next=https://evil.com would bounce a freshly signed-in user to a
// phishing site ("open redirect"). "//evil.com" is also an absolute URL.
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/dashboard";
}
