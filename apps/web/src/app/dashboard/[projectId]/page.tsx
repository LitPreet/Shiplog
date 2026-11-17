import Link from "next/link";
import { db } from "@/lib/db";
import { requireProject } from "@/lib/auth";
import { parseAnswers } from "@/lib/form-fields";
import { STATUSES, STATUS_META, isStatus } from "@/lib/status";
import { ArrowRight, ArrowUp, Check, Inbox } from "@/components/icons";
import { DeleteFeedbackButton } from "./delete-feedback";
import { StatusSelect } from "./status-select";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { projectId } = await params;
  const { status: statusParam } = await searchParams;
  const { project } = await requireProject(projectId);
  const filter = isStatus(statusParam) ? statusParam : null;

  const [feedback, grouped] = await Promise.all([
    db.feedback.findMany({
      where: { projectId, ...(filter && { status: filter }) },
      orderBy: [{ voteCount: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    // Counts per status in one GROUP BY query instead of filtering in JS.
    db.feedback.groupBy({ by: ["status"], where: { projectId }, _count: true, _sum: { voteCount: true } }),
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, grouped.find((g) => g.status === s)?._count ?? 0]));
  const total = grouped.reduce((n, g) => n + g._count, 0);
  const totalVotes = grouped.reduce((n, g) => n + (g._sum.voteCount ?? 0), 0);
  const topVotes = Math.max(1, ...feedback.map((f) => f.voteCount));

  const stats = [
    { label: "Ideas", value: total },
    { label: "Votes", value: totalVotes },
    { label: "In progress", value: counts.IN_PROGRESS },
    { label: "Shipped", value: counts.DONE, accent: true },
  ];

  const setup = [
    { done: project.allowedOrigins.length > 0, label: "Allow your website" },
    { done: total > 0, label: "Paste the script and get your first idea" },
  ];
  const needsSetup = setup.some((s) => !s.done);

  return (
    <>
      {needsSetup && (
        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Finish setting up</h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm sm:flex-row sm:gap-5">
              {setup.map((s) => (
                <li key={s.label} className={`flex items-center gap-1.5 ${s.done ? "text-muted line-through" : ""}`}>
                  <span className={`grid size-4 place-items-center rounded-full border ${s.done ? "border-done bg-done text-white" : "border-foreground/30"}`}>
                    {s.done && <Check className="size-3" />}
                  </span>
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
          <Link
            href={`/dashboard/${projectId}/settings`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-110"
          >
            Open settings <ArrowRight />
          </Link>
        </section>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-sm text-muted">{s.label}</div>
            <div className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${s.accent ? "text-done" : ""}`}>{s.value}</div>
          </div>
        ))}
      </section>

      {/* Status breakdown + filter */}
      {total > 0 && (
        <section className="mt-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-subtle">
            {STATUSES.filter((s) => counts[s] > 0).map((s) => (
              <div key={s} className={STATUS_META[s].bar} style={{ width: `${(counts[s] / total) * 100}%` }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-sm">
            <FilterChip href={`/dashboard/${projectId}`} active={!filter}>
              All <span className="font-medium text-foreground tabular-nums">{total}</span>
            </FilterChip>
            {STATUSES.map((s) => (
              <FilterChip key={s} href={`/dashboard/${projectId}?status=${s}`} active={filter === s}>
                <span className={`size-2 rounded-full ${STATUS_META[s].dot}`} />
                {STATUS_META[s].label}
                <span className="font-medium text-foreground tabular-nums">{counts[s]}</span>
              </FilterChip>
            ))}
          </div>
        </section>
      )}

      {/* Feedback */}
      <h2 className="mt-10 mb-4 flex items-baseline gap-2 text-xl font-semibold tracking-tight">
        {filter ? STATUS_META[filter].label : "All feedback"}
        <span className="text-base font-normal text-muted tabular-nums">{feedback.length}</span>
      </h2>
      {feedback.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-xl text-accent">
            <Inbox />
          </span>
          <p className="mt-4 font-semibold">{filter ? "Nothing with this status" : "Nothing yet"}</p>
          <p className="mt-1 text-sm text-muted">
            {filter ? "Try another filter." : "Feedback from your widget will show up here."}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {feedback.map((f, i) => {
            const answers = parseAnswers(f.answers);
            return (
              <li
                key={f.id}
                className={`group flex gap-4 px-5 py-4 transition hover:bg-subtle/60 ${i > 0 ? "border-t border-border" : ""} ${f.status === "CLOSED" ? "opacity-60" : ""}`}
              >
                <div className="flex w-12 shrink-0 flex-col items-center self-start rounded-xl border border-border bg-background py-2">
                  <ArrowUp className="text-muted" />
                  <span className="text-sm font-semibold tabular-nums">{f.voteCount}</span>
                  {/* Demand relative to the most-voted idea */}
                  <span className="mt-1.5 h-1 w-7 overflow-hidden rounded-full bg-subtle">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(f.voteCount / topVotes) * 100}%` }} />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">{f.title}</div>
                  {f.description && <p className="mt-1 text-sm whitespace-pre-line text-muted">{f.description}</p>}
                  {answers.length > 0 && (
                    <dl className="mt-2.5 flex flex-wrap gap-1.5">
                      {answers.map((a) => (
                        <div key={a.fieldId} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-xs">
                          <dt className="text-muted">{a.label}</dt>
                          <dd className="truncate font-medium">{a.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{f.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    {f.pageUrl && <span className="max-w-[280px] truncate font-mono">{f.pageUrl}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusSelect projectId={projectId} feedbackId={f.id} status={f.status} />
                  <DeleteFeedbackButton projectId={projectId} feedbackId={f.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition ${
        active ? "border-foreground/30 bg-subtle text-foreground" : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
