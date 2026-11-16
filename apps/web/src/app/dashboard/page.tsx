import Link from "next/link";
import { db } from "@/lib/db";

// Server Component: this runs on the server and queries the DB directly.
// No API route, no client-side fetching, no loading spinner needed.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { feedback: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Your projects</h1>
      {projects.length === 0 ? (
        <p className="text-neutral-500">No projects yet. Run <code>npm run db:seed</code> to create a demo one.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/${p.id}`}
                className="block rounded-xl border border-neutral-200 p-5 transition hover:border-indigo-400 dark:border-neutral-800"
              >
                <div className="font-semibold">{p.name}</div>
                <div className="mt-1 text-sm text-neutral-500">{p._count.feedback} feedback items</div>
                <code className="mt-3 block text-xs text-neutral-400">{p.publicKey}</code>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
