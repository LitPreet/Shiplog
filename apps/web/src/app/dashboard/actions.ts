"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEMO_READ_ONLY, isDemoUser } from "@/lib/demo";
import { MAX_PROJECTS } from "@/lib/limits";
import { generatePublicKey, normalizeOrigin } from "@/lib/origins";


export type CreateProjectState = { error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(1, "Give your project a name").max(60),
  origin: z.string().trim().max(200),
});

export async function createProject(_prev: CreateProjectState, form: FormData): Promise<CreateProjectState> {
  const user = await requireUser();
  if (isDemoUser(user)) return { error: DEMO_READ_ONLY.error };

  const parsed = schema.safeParse({ name: form.get("name"), origin: form.get("origin") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const origin = parsed.data.origin ? normalizeOrigin(parsed.data.origin) : null;
  if (parsed.data.origin && !origin) return { error: "Website must be a domain like acme.com or https://app.acme.com" };

  const count = await db.project.count({ where: { ownerId: user.id } });
  if (count >= MAX_PROJECTS) return { error: `You can have up to ${MAX_PROJECTS} projects on the free plan.` };

  const project = await db.project.create({
    data: {
      name: parsed.data.name,
      ownerId: user.id,
      publicKey: generatePublicKey(),
      allowedOrigins: origin ? [origin] : [],
    },
  });
  redirect(`/dashboard/${project.id}/settings`);
}
