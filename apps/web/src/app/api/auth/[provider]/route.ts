import { cookies } from "next/headers";
import { appUrl } from "@/lib/app-url";
import { authorizationUrl, getProvider, randomToken } from "@/lib/oauth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";

// GET /api/auth/:provider?next=/dashboard
// Step 1 of "Continue with GitHub/Google": remember a random `state` and PKCE
// verifier in short-lived cookies, then send the browser to the provider.
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await params;
  const base = await appUrl();
  const provider = getProvider(id);
  if (!provider) return Response.redirect(`${base}/login?error=oauth_unavailable`, 302);

  if (!rateLimit(`oauth:${clientIp(req)}`, 20, 10 * 60_000).ok) {
    return Response.redirect(`${base}/login?error=oauth_rate_limited`, 302);
  }

  const state = randomToken();
  const verifier = randomToken();
  const jar = await cookies();
  // httpOnly: page scripts can't read them. SameSite=Lax: still sent on the
  // top-level redirect back from the provider. 10 minutes is plenty to log in.
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 600,
  };
  jar.set("oauth_state", state, opts);
  jar.set("oauth_verifier", verifier, opts);
  jar.set("oauth_next", safeNext(new URL(req.url).searchParams.get("next")), opts);

  const redirectUri = `${base}/api/auth/${provider.id}/callback`;
  return Response.redirect(authorizationUrl(provider, { state, verifier, redirectUri }), 302);
}
