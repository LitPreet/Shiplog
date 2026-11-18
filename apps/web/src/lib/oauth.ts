import { createHash, randomBytes } from "node:crypto";

// "Continue with GitHub / Google", written by hand (OAuth 2.0 authorization
// code flow) so every step is visible:
//
//  1. /api/auth/:provider           create random `state` + PKCE verifier, store both
//                                   in short-lived httpOnly cookies, redirect to provider
//  2. provider login + consent
//  3. /api/auth/:provider/callback  check `state` matches the cookie (stops login CSRF),
//                                   exchange `code` + verifier for a token (server-side,
//                                   with the client secret), fetch the VERIFIED email,
//                                   find/link/create the user, start our normal session.

export type ProviderId = "github" | "google";

type Provider = {
  id: ProviderId;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientId?: string;
  clientSecret?: string;
};

function providers(): Record<ProviderId, Provider> {
  return {
    github: {
      id: "github",
      label: "GitHub",
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scope: "read:user user:email",
      clientId: process.env.GITHUB_CLIENT_ID?.trim(),
      clientSecret: process.env.GITHUB_CLIENT_SECRET?.trim(),
    },
    google: {
      id: "google",
      label: "Google",
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      clientId: process.env.GOOGLE_CLIENT_ID?.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
    },
  };
}

// Only providers with credentials configured get a button.
export function enabledProviders(): { id: ProviderId; label: string }[] {
  return Object.values(providers())
    .filter((p) => p.clientId && p.clientSecret)
    .map(({ id, label }) => ({ id, label }));
}

export function getProvider(id: string): Provider | null {
  const p = providers()[id as ProviderId];
  return p && p.clientId && p.clientSecret ? p : null;
}

// ---------- state + PKCE ----------

export const randomToken = () => randomBytes(32).toString("base64url");

// PKCE: we send sha256(verifier) up front and the verifier itself at token
// exchange, so a stolen authorization code is useless without this browser's cookie.
export const pkceChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export function authorizationUrl(p: Provider, { state, verifier, redirectUri }: { state: string; verifier: string; redirectUri: string }) {
  const url = new URL(p.authorizeUrl);
  url.search = new URLSearchParams({
    client_id: p.clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: p.scope,
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
    ...(p.id === "google" && { prompt: "select_account" }),
  }).toString();
  return url.toString();
}

// ---------- token + profile ----------

export type OAuthProfile = { providerAccountId: string; email: string; emailVerified: boolean; name: string };

export async function exchangeCode(p: Provider, { code, verifier, redirectUri }: { code: string; verifier: string; redirectUri: string }) {
  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: p.clientId!,
      client_secret: p.clientSecret!,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) throw new Error(`token exchange failed (${res.status} ${data.error ?? ""})`);
  return data.access_token;
}

async function getJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": "Shiplog" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`profile request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export async function fetchProfile(p: Provider, token: string): Promise<OAuthProfile> {
  if (p.id === "github") {
    const user = await getJson<{ id: number; login: string; name: string | null }>("https://api.github.com/user", token);
    // The profile email can be hidden or unverified; ask for the primary VERIFIED one.
    const emails = await getJson<{ email: string; primary: boolean; verified: boolean }[]>("https://api.github.com/user/emails", token);
    const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
    return {
      providerAccountId: String(user.id),
      email: (primary?.email ?? "").toLowerCase(),
      emailVerified: Boolean(primary),
      name: user.name || user.login,
    };
  }
  const info = await getJson<{ sub: string; email?: string; email_verified?: boolean; name?: string }>(
    "https://openidconnect.googleapis.com/v1/userinfo",
    token,
  );
  return {
    providerAccountId: info.sub,
    email: (info.email ?? "").toLowerCase(),
    emailVerified: info.email_verified === true,
    name: info.name || (info.email ?? "").split("@")[0],
  };
}

// ---------- account linking (pure, unit-tested) ----------

export type LinkDecision =
  | { action: "login"; userId: string }
  | { action: "link"; userId: string; revokePassword: boolean }
  | { action: "create" };

// Decides what a successful provider login means for our users table.
//
// The subtle case: someone signs up with *your* email and a password before
// you ever use Shiplog (we never verified that email). When you later click
// "Continue with Google", Google proves you own the address, so we link to
// that account AND revoke the unverified password and its sessions. Otherwise
// the squatter would keep a working password on your account
// ("pre-account takeover").
export function decideLink(input: {
  linkedUserId: string | null; // user already linked to this provider identity
  emailUser: { id: string; hasPassword: boolean; linkedAccounts: number } | null; // user with the same email
}): LinkDecision {
  if (input.linkedUserId) return { action: "login", userId: input.linkedUserId };
  if (input.emailUser) {
    // Ownership was never proven if no provider has ever been linked.
    const revokePassword = input.emailUser.hasPassword && input.emailUser.linkedAccounts === 0;
    return { action: "link", userId: input.emailUser.id, revokePassword };
  }
  return { action: "create" };
}
