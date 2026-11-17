import { z } from "zod";

// Custom form fields that a project owner adds to the widget's "Suggest" form
// (e.g. "Which plan are you on?" as a dropdown).
//
// The SAME config drives three things, so they can never disagree:
//   1. the form builder in the dashboard (what the owner can save),
//   2. the form the widget renders,
//   3. server-side validation of submissions (buildAnswersSchema below).
// The widget is not trusted: a visitor could POST anything with curl.

export const FIELD_TYPES = ["text", "textarea", "select", "email", "number"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  select: "Dropdown",
  email: "Email",
  number: "Number",
};

export const MAX_FIELDS = 8;

export const WIDGET_THEMES = ["light", "dark", "auto"] as const;
export type WidgetTheme = (typeof WIDGET_THEMES)[number];
export const parseTheme = (v: string): WidgetTheme => ((WIDGET_THEMES as readonly string[]).includes(v) ? (v as WidgetTheme) : "light");

export const formFieldSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,40}$/i, "Invalid field id"),
    label: z.string().trim().min(1, "Every field needs a label").max(60),
    type: z.enum(FIELD_TYPES),
    required: z.boolean(),
    placeholder: z.string().trim().max(80).optional(),
    options: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  })
  .refine((f) => f.type !== "select" || (f.options?.length ?? 0) >= 2, {
    message: "Dropdowns need at least 2 options",
  });

export const formFieldsSchema = z
  .array(formFieldSchema)
  .max(MAX_FIELDS, `At most ${MAX_FIELDS} custom fields`)
  .refine((fs) => new Set(fs.map((f) => f.id)).size === fs.length, "Field ids must be unique");

export type FormField = z.infer<typeof formFieldSchema>;
export type Answer = { fieldId: string; label: string; value: string };

// Reads the JSON column defensively: bad/old data becomes "no fields"
// instead of crashing the widget.
export function parseFormFields(value: unknown): FormField[] {
  const parsed = formFieldsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseAnswers(value: unknown): Answer[] {
  return Array.isArray(value) ? (value as Answer[]).filter((a) => a && typeof a.label === "string") : [];
}

function valueSchema(field: FormField) {
  switch (field.type) {
    case "email":
      return z.string().trim().email(`${field.label}: enter a valid email`).max(200);
    case "number":
      return z
        .string()
        .trim()
        .max(30)
        .refine((v) => v !== "" && Number.isFinite(Number(v)), `${field.label}: enter a number`);
    case "select":
      // Only values the owner configured: blocks arbitrary strings via the API.
      return z.enum(field.options as [string, ...string[]], {
        errorMap: () => ({ message: `${field.label}: pick one of the options` }),
      });
    case "textarea":
      return z.string().trim().max(2000);
    default:
      return z.string().trim().max(300);
  }
}

// Validates the visitor's { [fieldId]: value } against the owner's config and
// returns label-snapshotted answers. Unknown keys are dropped.
export function validateAnswers(
  fields: FormField[],
  input: Record<string, unknown> | undefined,
): { ok: true; answers: Answer[] } | { ok: false; error: string } {
  const answers: Answer[] = [];
  for (const field of fields) {
    const raw = input?.[field.id];
    const empty = raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "");
    if (empty) {
      if (field.required) return { ok: false, error: `${field.label} is required` };
      continue;
    }
    const parsed = valueSchema(field).safeParse(typeof raw === "number" ? String(raw) : raw);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? `${field.label} is invalid` };
    answers.push({ fieldId: field.id, label: field.label, value: String(parsed.data) });
  }
  return { ok: true, answers };
}
