import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "./db";

// Session auth, written by hand (no auth library) so every step is visible:
//
//   login  -> random 32-byte token -> cookie (httpOnly) + DB row keyed by sha256(token)
//   request -> read cookie -> hash it -> look up session -> user
//   logout -> delete the row + clear the cookie
//
// Why DB sessions instead of a JWT: we can revoke them instantly (logout,
// password change), and the cookie carries no user data at all.

export const SESSION_COOKIE = "shiplog_session";
const SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript on the page can't read it (XSS can't steal it)
    sameSite: "lax", // not sent on cross-site POSTs (CSRF protection)
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

// cache(): many components may ask for the user during one request; this
// makes it one DB query per request instead of one per call.
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  // The cookie also expires, but never trust the client's clock/cookie alone.
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Authorization (not just authentication): loads a project ONLY if the
// current user owns it. Returns 404, not 403, so we don't reveal which
// project IDs exist.
export async function requireProject(projectId: string) {
  const user = await requireUser();
  const project = await db.project.findFirst({ where: { id: projectId, ownerId: user.id } });
  if (!project) notFound();
  return { user, project };
}
