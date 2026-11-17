import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { readableInk } from "@/lib/color";
import { MAX_PROJECTS } from "@/lib/limits";
import { ArrowRight, Inbox } from "@/components/icons";
import { NewProject } from "./new-project";

// Server Component: this runs on the server and queries the DB directly.
// No API route, no client-side fetching, no loading spinner needed.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  // Scoped to the signed-in owner: you only ever see your own projects.
  const projects = await db.project.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { feedback: true } } },
  });
  const atLimit = projects.length >= MAX_PROJECTS;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs font-medium tracking-widest text-accent uppercase">Workspace</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Hi {user.name.split(" ")[0]}, here are your projects</h1>
          <p className="mt-1 text-sm text-muted">
            {projects.length} of {MAX_PROJECTS} projects used
          </p>
        </div>
        {projects.length > 0 && <NewProject disabled={atLimit} />}
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-xl text-accent">
            <Inbox />
          </span>
          <p className="mt-4 font-semibold">Create your first project</p>
          <p className="mt-1 mb-6 max-w-sm text-sm text-muted">
            A project is one website or app. You&apos;ll get a script tag that only works on the domains you allow.
          </p>
          <NewProject />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/${p.id}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_12px_40px_-16px_var(--accent)]"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="grid size-10 place-items-center rounded-xl text-lg font-semibold"
                    style={{ background: p.accentColor, color: readableInk(p.accentColor) }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  {p.isActive ? (
                    <ArrowRight className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
                  ) : (
                    <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-medium text-muted">Paused</span>
                  )}
                </div>
                <div className="mt-4 font-semibold">{p.name}</div>
                <div className="mt-1 text-sm text-muted">
                  <span className="font-medium text-foreground tabular-nums">{p._count.feedback}</span> feedback items
                </div>
                <div className="mt-4 truncate border-t border-border pt-3 font-mono text-xs text-muted">
                  {p.allowedOrigins[0] ?? "No website added yet"}
                  {p.allowedOrigins.length > 1 && ` +${p.allowedOrigins.length - 1}`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
