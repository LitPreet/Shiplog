import Link from "next/link";
import { db } from "@/lib/db";
import { ArrowRight, Inbox } from "@/components/icons";

// Server Component: this runs on the server and queries the DB directly.
// No API route, no client-side fetching, no loading spinner needed.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { feedback: true } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="font-mono text-xs font-medium tracking-widest text-accent uppercase">Workspace</div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your projects</h1>

      {projects.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-xl text-accent">
            <Inbox />
          </span>
          <p className="mt-4 font-semibold">No projects yet</p>
          <p className="mt-1 text-sm text-muted">
            Run <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-xs">npm run db:seed</code> to create a demo one.
          </p>
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
                  <span className="grid size-10 place-items-center rounded-xl bg-subtle text-lg font-semibold">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <ArrowRight className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                <div className="mt-4 font-semibold">{p.name}</div>
                <div className="mt-1 text-sm text-muted">
                  <span className="font-medium text-foreground tabular-nums">{p._count.feedback}</span> feedback items
                </div>
                <code className="mt-4 truncate border-t border-border pt-3 font-mono text-xs text-muted">{p.publicKey}</code>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
