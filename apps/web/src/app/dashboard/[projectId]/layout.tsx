import Link from "next/link";
import { requireProject } from "@/lib/auth";
import { readableInk } from "@/lib/color";
import { ProjectTabs } from "./tabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { project } = await requireProject(projectId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm text-muted transition hover:text-foreground">
        ← All projects
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl font-semibold" style={{ background: project.accentColor, color: readableInk(project.accentColor) }}>
          {project.name.charAt(0).toUpperCase()}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
        {project.isActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-done/10 px-2.5 py-0.5 text-xs font-semibold text-done">
            <span className="size-1.5 rounded-full bg-done" /> Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-0.5 text-xs font-semibold text-muted">
            <span className="size-1.5 rounded-full bg-muted" /> Paused
          </span>
        )}
      </div>
      <ProjectTabs projectId={project.id} />
      <div className="mt-8">{children}</div>
    </main>
  );
}
