import { requireProject } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { parseFormFields, parseTheme } from "@/lib/form-fields";
import { MAX_ORIGINS } from "@/lib/limits";
import { CopyButton } from "@/components/copy-button";
import { DangerZone, GeneralSettings, KeyCard, OriginsCard } from "./security";
import { WidgetEditor } from "./widget-editor";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await requireProject(projectId);
  const base = await appUrl();
  const snippet = `<script src="${base}/widget.js" data-shiplog-key="${project.publicKey}" defer></script>`;

  return (
    <div className="flex flex-col gap-10">
      <Section title="Install" body="Paste this before </body> on every page where the widget should appear.">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">
              {project.allowedOrigins.length === 0 ? (
                <span className="text-progress">Add a website below, or every request will be rejected.</span>
              ) : (
                <>Works on {project.allowedOrigins.length} allowed website{project.allowedOrigins.length > 1 && "s"}.</>
              )}
            </span>
            <CopyButton text={snippet} label="Copy snippet" />
          </div>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0e0e10] p-4 font-mono text-xs leading-relaxed text-[#e8e8e6]">{snippet}</pre>
        </div>
      </Section>

      <Section title="Widget" body="Heading, colours and the questions your users answer. Changes go live on your site immediately, no re-install.">
        <WidgetEditor
          projectId={project.id}
          initial={{
            widgetTitle: project.widgetTitle,
            widgetSubtitle: project.widgetSubtitle,
            launcherText: project.launcherText,
            accentColor: project.accentColor,
            widgetTheme: parseTheme(project.widgetTheme),
            titleLabel: project.titleLabel,
            titlePlaceholder: project.titlePlaceholder,
            showDescription: project.showDescription,
            formFields: parseFormFields(project.formFields),
          }}
        />
      </Section>

      <Section
        title="Access control"
        body="Your key is public (it's in your page source), so it only works from the websites you list here. Requests from anywhere else get 403."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <OriginsCard projectId={project.id} origins={project.allowedOrigins} max={MAX_ORIGINS} />
          <KeyCard projectId={project.id} publicKey={project.publicKey} />
        </div>
      </Section>

      <Section title="General">
        <GeneralSettings projectId={project.id} name={project.name} isActive={project.isActive} />
      </Section>

      <Section title="Danger zone">
        <DangerZone projectId={project.id} name={project.name} />
      </Section>
    </div>
  );
}

function Section({ title, body, children }: { title: string; body?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[240px_1fr] lg:gap-8">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {body && <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
