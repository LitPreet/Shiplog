"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { formFieldsSchema } from "@/lib/form-fields";
import { MAX_ORIGINS } from "@/lib/limits";
import { generatePublicKey, normalizeOrigin } from "@/lib/origins";
import { STATUSES } from "@/lib/status";

// Server Actions are public HTTP endpoints under the hood: anyone can call
// them with any arguments. So EVERY action starts with requireProject(),
// which checks the session AND that this user owns this project.

type Result = { ok: true } | { ok: false; error: string };

const refresh = (projectId: string) => revalidatePath(`/dashboard/${projectId}`, "layout");

export async function updateStatus(projectId: string, feedbackId: string, status: string) {
  await requireProject(projectId);
  const parsed = z.enum(STATUSES).parse(status);
  // projectId in the filter: only update if the item belongs to this project.
  await db.feedback.updateMany({ where: { id: feedbackId, projectId }, data: { status: parsed } });
  refresh(projectId);
}

export async function deleteFeedback(projectId: string, feedbackId: string) {
  await requireProject(projectId);
  await db.feedback.deleteMany({ where: { id: feedbackId, projectId } });
  refresh(projectId);
}

// ---------- Widget appearance + form ----------

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "Accent must be a hex colour like #ff5b2e");

const widgetSchema = z.object({
  widgetTitle: z.string().trim().min(1, "Heading can't be empty").max(60),
  widgetSubtitle: z.string().trim().max(120),
  launcherText: z.string().trim().min(1, "Button text can't be empty").max(24),
  accentColor: hex,
  titleLabel: z.string().trim().min(1, "Idea field label can't be empty").max(60),
  titlePlaceholder: z.string().trim().max(80),
  showDescription: z.boolean(),
  formFields: formFieldsSchema,
});
export type WidgetSettings = z.infer<typeof widgetSchema>;

export async function saveWidget(projectId: string, input: WidgetSettings): Promise<Result> {
  await requireProject(projectId);
  const parsed = widgetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  await db.project.update({ where: { id: projectId }, data: parsed.data });
  refresh(projectId);
  return { ok: true };
}

// ---------- General ----------

export async function renameProject(projectId: string, _prev: unknown, form: FormData) {
  await requireProject(projectId);
  const name = z.string().trim().min(1).max(60).safeParse(form.get("name"));
  if (!name.success) return { ok: false, error: "Name must be 1–60 characters" } satisfies Result;
  await db.project.update({ where: { id: projectId }, data: { name: name.data } });
  refresh(projectId);
  return { ok: true } satisfies Result;
}

export async function setActive(projectId: string, isActive: boolean) {
  await requireProject(projectId);
  await db.project.update({ where: { id: projectId }, data: { isActive } });
  refresh(projectId);
}

// ---------- Security: origins + key ----------

export async function addOrigin(projectId: string, _prev: unknown, form: FormData): Promise<Result> {
  const { project } = await requireProject(projectId);
  const origin = normalizeOrigin(String(form.get("origin") ?? ""));
  if (!origin) return { ok: false, error: "Enter a domain like acme.com or https://app.acme.com" };
  if (project.allowedOrigins.includes(origin)) return { ok: false, error: `${origin} is already allowed` };
  if (project.allowedOrigins.length >= MAX_ORIGINS) return { ok: false, error: `Up to ${MAX_ORIGINS} websites per project` };
  await db.project.update({ where: { id: projectId }, data: { allowedOrigins: { push: origin } } });
  refresh(projectId);
  return { ok: true };
}

export async function removeOrigin(projectId: string, origin: string) {
  const { project } = await requireProject(projectId);
  await db.project.update({
    where: { id: projectId },
    data: { allowedOrigins: project.allowedOrigins.filter((o) => o !== origin) },
  });
  refresh(projectId);
}

// The old key stops working immediately; the owner re-pastes the snippet.
export async function rotateKey(projectId: string) {
  await requireProject(projectId);
  await db.project.update({ where: { id: projectId }, data: { publicKey: generatePublicKey() } });
  refresh(projectId);
}

export async function deleteProject(projectId: string) {
  await requireProject(projectId);
  // Feedback and votes go too (onDelete: Cascade in the schema).
  await db.project.delete({ where: { id: projectId } });
  redirect("/dashboard");
}
