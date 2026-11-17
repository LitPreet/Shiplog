import { aiConfig, AiError, chatStream } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseFormFields } from "@/lib/form-fields";
import { rateLimit } from "@/lib/rate-limit";
import { buildSummaryInput, SUMMARY_SYSTEM_PROMPT } from "@/lib/summary";

// POST /api/projects/:projectId/summary
// Owner-only. Streams an AI summary of the project's feedback as plain text,
// so the dashboard can render it token by token. A Route Handler (not a Server
// Action) because Server Actions can't stream a response body.
export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });

  // Same ownership rule as every dashboard page: 404, not 403.
  const project = await db.project.findFirst({ where: { id: projectId, ownerId: user.id } });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  if (!aiConfig()) {
    return Response.json({ error: "AI isn't configured on this server (set AI_API_KEY)." }, { status: 503 });
  }
  if (!rateLimit(`summary:${user.id}`, 5, 10 * 60_000).ok) {
    return Response.json({ error: "You've used AI summaries a lot recently. Try again in a few minutes." }, { status: 429 });
  }

  const feedback = await db.feedback.findMany({
    where: { projectId },
    orderBy: [{ voteCount: "desc" }, { createdAt: "desc" }],
  });
  if (feedback.length === 0) return Response.json({ error: "No feedback to summarise yet." }, { status: 400 });

  try {
    const stream = await chatStream(
      [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        { role: "user", content: buildSummaryInput(feedback, parseFormFields(project.formFields)) },
      ],
      // If the owner clicks "Stop" (or closes the tab), cancel the upstream call too.
      { signal: req.signal },
    );
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const busy = err instanceof AiError && err.status === 429;
    return Response.json(
      { error: busy ? "The AI provider is busy (free-tier limit). Try again in a minute." : "The AI service is unavailable right now." },
      { status: busy ? 429 : 502 },
    );
  }
}
