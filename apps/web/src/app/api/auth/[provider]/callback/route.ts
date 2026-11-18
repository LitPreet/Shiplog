import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { appUrl } from "@/lib/app-url";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { decideLink, exchangeCode, fetchProfile, getProvider } from "@/lib/oauth";
import { safeNext } from "@/lib/safe-next";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// GET /api/auth/:provider/callback?code=...&state=...
// Step 3: the provider sends the browser back here after the user logs in.
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await params;
  const base = await appUrl();
  const fail = (code: string) => Response.redirect(`${base}/login?error=${code}`, 302);

  const provider = getProvider(id);
  if (!provider) return fail("oauth_unavailable");

  const url = new URL(req.url);
  const jar = await cookies();
  const expectedState = jar.get("oauth_state")?.value ?? "";
  const verifier = jar.get("oauth_verifier")?.value ?? "";
  const next = safeNext(jar.get("oauth_next")?.value);
  // One-time use, whatever happens next.
  for (const name of ["oauth_state", "oauth_verifier", "oauth_next"]) jar.delete({ name, path: "/api/auth" });

  // User clicked "Cancel" on the provider's consent screen.
  if (url.searchParams.get("error")) return fail("oauth_cancelled");

  // CSRF protection: the state must match the one THIS browser was given.
  // Otherwise an attacker could finish a login flow they started, signing the
  // victim into the attacker's account.
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!code || !expectedState || !verifier || !same(state, expectedState)) return fail("oauth_state");

  try {
    const redirectUri = `${base}/api/auth/${provider.id}/callback`;
    const token = await exchangeCode(provider, { code, verifier, redirectUri });
    const profile = await fetchProfile(provider, token);

    // Only trust emails the provider has verified; otherwise anyone could claim
    // someone else's address on GitHub and land in their Shiplog account.
    if (!profile.email || !profile.emailVerified) return fail("oauth_unverified_email");

    const [linked, emailUser] = await Promise.all([
      db.oAuthAccount.findUnique({
        where: { provider_providerAccountId: { provider: provider.id, providerAccountId: profile.providerAccountId } },
        select: { userId: true },
      }),
      db.user.findUnique({
        where: { email: profile.email },
        select: { id: true, passwordHash: true, _count: { select: { accounts: true } } },
      }),
    ]);

    const decision = decideLink({
      linkedUserId: linked?.userId ?? null,
      emailUser: emailUser
        ? { id: emailUser.id, hasPassword: Boolean(emailUser.passwordHash), linkedAccounts: emailUser._count.accounts }
        : null,
    });

    let userId: string;
    if (decision.action === "login") {
      userId = decision.userId;
    } else if (decision.action === "link") {
      userId = decision.userId;
      await db.$transaction([
        db.oAuthAccount.create({ data: { provider: provider.id, providerAccountId: profile.providerAccountId, userId } }),
        // Pre-account-takeover protection (see decideLink): the provider just
        // proved who owns this email, so any password/sessions created before
        // that proof are revoked.
        ...(decision.revokePassword
          ? [
              db.user.update({ where: { id: userId }, data: { passwordHash: null } }),
              db.session.deleteMany({ where: { userId } }),
            ]
          : []),
      ]);
    } else {
      const user = await db.user.create({
        data: {
          email: profile.email,
          name: profile.name.slice(0, 80),
          accounts: { create: { provider: provider.id, providerAccountId: profile.providerAccountId } },
        },
      });
      userId = user.id;
    }

    await createSession(userId);
    return Response.redirect(`${base}${next}`, 302);
  } catch (err) {
    console.error(`[oauth] ${provider.id} login failed: ${(err as Error).message}`);
    return fail("oauth_failed");
  }
}
