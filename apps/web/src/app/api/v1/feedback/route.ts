import { db } from "@/lib/db";
import { json, preflight } from "@/lib/cors";
import { authenticateWidget } from "@/lib/widget-auth";
import { createFeedbackSchema, visitorIdSchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const OPTIONS = preflight;

// GET /api/v1/feedback?visitorId=...
// The public board shown inside the widget, most-voted first.
export async function GET(req: Request) {
  const auth = await authenticateWidget(req);
  if (!auth.ok) return auth.response;

  const visitorId = visitorIdSchema.safeParse(new URL(req.url).searchParams.get("visitorId"));

  const items = await db.feedback.findMany({
    where: { projectId: auth.project.id, status: { not: "CLOSED" } },
    orderBy: [{ voteCount: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      voteCount: true,
      createdAt: true,
      // Only this visitor's vote (0 or 1 rows) -> tells the UI "did I vote?"
      votes: visitorId.success ? { where: { visitorId: visitorId.data }, select: { id: true } } : false,
    },
  });

  return json(req, {
    items: items.map(({ votes, ...item }) => ({ ...item, hasVoted: (votes?.length ?? 0) > 0 })),
  });
}

// POST /api/v1/feedback  { visitorId, title, description?, pageUrl? }
export async function POST(req: Request) {
  const auth = await authenticateWidget(req);
  if (!auth.ok) return auth.response;

  const limit = rateLimit(`submit:${auth.project.id}:${clientIp(req)}`, 5, 60_000);
  if (!limit.ok) {
    return json(req, { error: "Too many submissions, try again shortly" }, 429, {
      "Retry-After": String(limit.retryAfterSec),
    });
  }

  const parsed = createFeedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json(req, { error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }
  const { visitorId, title, description, pageUrl } = parsed.data;

  // The submitter automatically upvotes their own idea (same as Canny etc.).
  // Nested create = feedback row + vote row in ONE transaction.
  const feedback = await db.feedback.create({
    data: {
      projectId: auth.project.id,
      title,
      description: description || null,
      pageUrl,
      visitorId,
      voteCount: 1,
      votes: { create: { visitorId } },
    },
    select: { id: true, title: true, description: true, status: true, voteCount: true, createdAt: true },
  });

  return json(req, { item: { ...feedback, hasVoted: true } }, 201);
}
