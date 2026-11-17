import { z } from "zod";
import { db } from "@/lib/db";
import { json, preflight } from "@/lib/cors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { findDuplicatesWithAi } from "@/lib/similar";
import { visitorIdSchema } from "@/lib/validation";
import { authenticateWidget } from "@/lib/widget-auth";

export const OPTIONS = preflight;

const bodySchema = z.object({
  visitorId: visitorIdSchema,
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
});

// POST /api/v1/feedback/check  { visitorId, title, description? }
// Called when the visitor clicks "Post idea", before anything is saved. Uses the
// LLM to spot existing ideas that ask for the same thing in different words.
// Always answers 200 with a (possibly empty) list: AI trouble must never stop
// someone from posting.
export async function POST(req: Request) {
  const auth = await authenticateWidget(req);
  if (!auth.ok) return auth.response;

  // Each check is an LLM call: keep it well inside free-tier quotas.
  if (!rateLimit(`check:${auth.project.id}:${clientIp(req)}`, 10, 60_000).ok) {
    return json(req, { duplicates: [], source: "skipped" });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(req, { error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  const { visitorId, title, description } = parsed.data;

  const { duplicates, source } = await findDuplicatesWithAi(auth.project.id, { title, description });
  const voted = await db.vote.findMany({
    where: { visitorId, feedbackId: { in: duplicates.map((d) => d.id) } },
    select: { feedbackId: true },
  });
  const votedIds = new Set(voted.map((v) => v.feedbackId));

  return json(req, { source, duplicates: duplicates.map(({ id, title, voteCount, status }) => ({ id, title, voteCount, status, hasVoted: votedIds.has(id) })) });
}
