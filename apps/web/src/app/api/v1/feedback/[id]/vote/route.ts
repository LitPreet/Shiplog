import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { json, preflight } from "@/lib/cors";
import { authenticateWidget } from "@/lib/widget-auth";
import { voteSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const OPTIONS = preflight;

// POST /api/v1/feedback/:id/vote  { visitorId }
// Toggles: votes if you haven't, removes your vote if you have.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authenticateWidget(req);
  if (!auth.ok) return auth.response;

  const limit = rateLimit(`vote:${auth.project.id}:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) return json(req, { error: "Slow down" }, 429);

  const parsed = voteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json(req, { error: "Invalid input" }, 400);
  const { visitorId } = parsed.data;

  // Security: the item must belong to THIS project, otherwise a key for
  // project A could vote on project B's feedback by guessing IDs.
  const feedback = await db.feedback.findFirst({
    where: { id, projectId: auth.project.id },
    select: { id: true },
  });
  if (!feedback) return json(req, { error: "Feedback not found" }, 404);

  try {
    // Interactive transaction: the vote row and the counter change together
    // or not at all, so voteCount can never drift from the real votes.
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.vote.findUnique({
        where: { feedbackId_visitorId: { feedbackId: id, visitorId } },
      });

      if (existing) {
        await tx.vote.delete({ where: { id: existing.id } });
        const f = await tx.feedback.update({ where: { id }, data: { voteCount: { decrement: 1 } } });
        return { voteCount: f.voteCount, hasVoted: false };
      }

      await tx.vote.create({ data: { feedbackId: id, visitorId } });
      const f = await tx.feedback.update({ where: { id }, data: { voteCount: { increment: 1 } } });
      return { voteCount: f.voteCount, hasVoted: true };
    });
    return json(req, result);
  } catch (err) {
    // P2002 = unique constraint violation: two "vote" requests raced (e.g.
    // double-click). The DB rejected the duplicate, so just report the
    // current state instead of erroring.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const f = await db.feedback.findUniqueOrThrow({ where: { id } });
      return json(req, { voteCount: f.voteCount, hasVoted: true });
    }
    throw err;
  }
}
