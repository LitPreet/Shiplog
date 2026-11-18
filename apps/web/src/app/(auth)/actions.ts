"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dummyPasswordHash, hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";

export type AuthState = { error?: string; email?: string; name?: string } | undefined;

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email").max(200);

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});


async function ip() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function signup(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = { name: form.get("name"), email: form.get("email"), password: form.get("password") };
  const echo = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };

  if (!rateLimit(`signup:${await ip()}`, 10, 60 * 60_000).ok) {
    return { ...echo, error: "Too many sign-ups from this network. Try again later." };
  }

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { ...echo, error: parsed.error.issues[0]?.message };
  const { name, email, password } = parsed.data;

  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { ...echo, error: "An account with this email already exists. Sign in instead." };

  const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const raw = { email: form.get("email"), password: form.get("password") };
  const echo = { email: String(raw.email ?? "") };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { ...echo, error: parsed.error.issues[0]?.message };
  const { email, password } = parsed.data;

  // Per IP+email, so one attacker can't lock out a real user from elsewhere,
  // and can't brute-force one account from one machine.
  if (!rateLimit(`login:${await ip()}:${email}`, 10, 15 * 60_000).ok) {
    return { ...echo, error: "Too many attempts. Wait a few minutes and try again." };
  }

  const user = await db.user.findUnique({ where: { email } });
  // Same message (and same scrypt work) for "no such user", "wrong password" and
  // "this account uses GitHub/Google": don't reveal which emails have accounts.
  const ok = user?.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : (await verifyPassword(password, await dummyPasswordHash()), false);
  if (!user || !ok) {
    return { ...echo, error: "Incorrect email or password." };
  }

  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
