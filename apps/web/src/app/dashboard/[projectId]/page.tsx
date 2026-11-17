import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { STATUSES, STATUS_META } from "@/lib/status";
import { CopyButton } from "@/components/copy-button";
import { ArrowUp, Globe, Inbox } from "@/components/icons";
import { StatusSelect } from "./status-select";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { feedback: { orderBy: [{ voteCount: "desc" }, { createdAt: "desc" }] } },
  });
  if (!project) notFound();

  const snippet = `<script src="https://YOUR-DOMAIN/widget.js" data-shiplog-key="${project.publicKey}" defer></script>`;
  const total = project.feedback.length;
  const totalVotes = project.feedback.reduce((sum, f) => sum + f.voteCount, 0);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, project.feedback.filter((f) => f.status === s).length]));
  const topVotes = Math.max(1, ...project.feedback.map((f) => f.voteCount));

  const stats = [
    { label: "Ideas", value: total },
    { label: "Votes", value: totalVotes },
    { label: "In progress", value: counts.IN_PROGRESS },
    { label: "Shipped", value: counts.DONE, accent: true },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm text-muted transition hover:text-foreground">
        ← All projects
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{project.name}</h1>

      {/* Stats */}
      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-sm text-muted">{s.label}</div>
            <div className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${s.accent ? "text-done" : ""}`}>{s.value}</div>
          </div>
        ))}
      </section>

      {/* Status breakdown */}
      {total > 0 && (
        <section className="mt-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-subtle">
            {STATUSES.filter((s) => counts[s] > 0).map((s) => (
              <div key={s} className={`${STATUS_META[s].bar} transition-all`} style={{ width: `${(counts[s] / total) * 100}%` }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            {STATUSES.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 text-muted">
                <span className={`size-2 rounded-full ${STATUS_META[s].dot}`} />
                {STATUS_META[s].label}
                <span className="font-medium text-foreground tabular-nums">{counts[s]}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Install */}
      <section className="mt-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Install</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
              Paste before <code className="font-mono text-xs">&lt;/body&gt;</code> on
              {project.allowedOrigins.length === 0 ? (
                <span className="text-progress">no allowed origins yet</span>
              ) : (
                project.allowedOrigins.map((o) => (
                  <span key={o} className="inline-flex items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 font-mono text-xs text-foreground">
                    <Globe className="text-muted" /> {o}
                  </span>
                ))
              )}
            </p>
          </div>
          <CopyButton text={snippet} label="Copy snippet" />
        </div>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0e0e10] p-4 font-mono text-xs text-[#e8e8e6]">{snippet}</pre>
      </section>

      {/* Feedback */}
      <h2 className="mt-12 mb-4 flex items-baseline gap-2 text-xl font-semibold tracking-tight">
        Feedback <span className="text-base font-normal text-muted tabular-nums">{total}</span>
      </h2>
      {total === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-xl text-accent">
            <Inbox />
          </span>
          <p className="mt-4 font-semibold">Nothing yet</p>
          <p className="mt-1 text-sm text-muted">Feedback from your widget will show up here.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {project.feedback.map((f, i) => (
            <li
              key={f.id}
              className={`group relative flex gap-4 px-5 py-4 transition hover:bg-subtle/60 ${i > 0 ? "border-t border-border" : ""} ${f.status === "CLOSED" ? "opacity-60" : ""}`}
            >
              {/* Relative demand bar behind the vote count */}
              <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-border bg-background py-2">
                <ArrowUp className="text-muted" />
                <span className="text-sm font-semibold tabular-nums">{f.voteCount}</span>
                <span className="mt-1.5 h-1 w-7 overflow-hidden rounded-full bg-subtle">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(f.voteCount / topVotes) * 100}%` }} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-snug">{f.title}</div>
                {f.description && <p className="mt-1 text-sm text-muted">{f.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{f.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  {f.pageUrl && <span className="max-w-[260px] truncate font-mono">{f.pageUrl}</span>}
                </div>
              </div>
              <div className="shrink-0">
                <StatusSelect projectId={project.id} feedbackId={f.id} status={f.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
