import { json, preflight } from "@/lib/cors";
import { parseFormFields, parseTheme } from "@/lib/form-fields";
import { authenticateWidget } from "@/lib/widget-auth";

export const OPTIONS = preflight;

// GET /api/v1/config
// Everything the widget needs to render itself: text, colour and the custom
// form. Fetched once per page load, so owners change the widget from the
// dashboard without customers re-pasting the script.
// Same key + origin + active checks as every other endpoint: a paused or
// misconfigured project gets an error and the widget simply doesn't render.
export async function GET(req: Request) {
  const auth = await authenticateWidget(req);
  if (!auth.ok) return auth.response;
  const p = auth.project;

  return json(
    req,
    {
      title: p.widgetTitle,
      subtitle: p.widgetSubtitle,
      launcherText: p.launcherText,
      accentColor: p.accentColor,
      theme: parseTheme(p.widgetTheme),
      titleLabel: p.titleLabel,
      titlePlaceholder: p.titlePlaceholder,
      showDescription: p.showDescription,
      fields: parseFormFields(p.formFields),
    },
    200,
    // Short browser cache: repeat page views don't refetch, and dashboard
    // edits still show up within a minute.
    { "Cache-Control": "private, max-age=60" },
  );
}
