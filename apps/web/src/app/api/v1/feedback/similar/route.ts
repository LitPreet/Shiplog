import { z } from "zod";
import { db } from "@/lib/db";
import { json, preflight } from "@/lib/cors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { findSimilar } from "@/lib/similar";
import { visitorIdSchema } from "@/lib/validation";
import { authenticateWidget } from "@/lib/widget-auth";

export const OPTIONS = preflight;

const querySchema = z.string().trim().min(3).max(120);

// GET /api/v1/feedback/similar?q=...&visitorId=...
// Ideas whose titles resemble what the visitor is typing (trigram match, no AI),
// so they can vote for an existing idea instead of posting a duplicate.
export async function GET(req: Request) {
  const auth = await authenticateWidget(req);
  if (!auth.ok) return auth.response;

  // Debounced on the client, but still capped: it's called while typing.
  if (!rateLimit(`similar:${auth.project.id}:${clientIp(req)}`, 60, 60_000).ok) {
    return json(req, { error: "Slow down" }, 429);
  }

  const params = new URL(req.url).searchParams;
  const q = querySchema.safeParse(params.get("q"));
  if (!q.success) return json(req, { items: [] });
  const visitorId = visitorIdSchema.safeParse(params.get("visitorId"));

  const matches = await findSimilar(auth.project.id, q.data);
  const voted = visitorId.success
    ? await db.vote.findMany({
        where: { visitorId: visitorId.data, feedbackId: { in: matches.map((m) => m.id) } },
        select: { feedbackId: true },
      })
    : [];
  const votedIds = new Set(voted.map((v) => v.feedbackId));

  return json(req, {
    items: matches.map(({ id, title, voteCount, status }) => ({ id, title, voteCount, status, hasVoted: votedIds.has(id) })),
  });
}
