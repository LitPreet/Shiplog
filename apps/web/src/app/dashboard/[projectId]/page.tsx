import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
        ← All projects
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{project.name}</h1>

      <section className="mt-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">Install</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Paste before &lt;/body&gt;. Allowed origins: {project.allowedOrigins.join(", ") || "none"}
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-100 p-3 text-xs dark:bg-neutral-900">{snippet}</pre>
      </section>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Feedback ({project.feedback.length})</h2>
      {project.feedback.length === 0 ? (
        <p className="text-neutral-500">Nothing yet. Feedback from your widget will show up here.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Votes</th>
                <th className="px-4 py-3 font-medium">Idea</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {project.feedback.map((f) => (
                <tr key={f.id} className="border-t border-neutral-200 align-top dark:border-neutral-800">
                  <td className="px-4 py-3 font-semibold tabular-nums">{f.voteCount}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{f.title}</div>
                    {f.description && <div className="mt-1 text-neutral-500">{f.description}</div>}
                    {f.pageUrl && <div className="mt-1 truncate text-xs text-neutral-400">from {f.pageUrl}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect projectId={project.id} feedbackId={f.id} status={f.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-neutral-500">
                    {f.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
