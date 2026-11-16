"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";

// Server Action: a function that runs on the server but can be called from a
// client component like a normal async function. Next.js creates the HTTP
// endpoint for us.
//
// TODO(phase 2 - auth): check the logged-in user owns this project. Right now
// the dashboard has no login, so anyone who can reach it can change statuses.

const statusSchema = z.enum(["OPEN", "PLANNED", "IN_PROGRESS", "DONE", "CLOSED"]);

export async function updateStatus(projectId: string, feedbackId: string, status: string) {
  const parsed = statusSchema.parse(status);
  // updateMany with projectId in the filter = only update if it belongs to this project.
  await db.feedback.updateMany({ where: { id: feedbackId, projectId }, data: { status: parsed } });
  revalidatePath(`/dashboard/${projectId}`);
}
