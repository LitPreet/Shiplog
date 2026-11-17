"use client";

import { useState, useTransition } from "react";
import { ArrowUp, Check, Message, Plus, X } from "@/components/icons";
import { FIELD_TYPES, FIELD_TYPE_LABEL, MAX_FIELDS, type FieldType, type FormField } from "@/lib/form-fields";
import { saveWidget, type WidgetSettings } from "../actions";

const PRESETS = ["#ff5b2e", "#6d5dfc", "#0ea5e9", "#10b981", "#e11d74", "#111114"];

const card = "rounded-2xl border border-border bg-card p-5";
const input =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15";

// Short random id for new fields. Stable across label edits, so answers stay
// linked to the right field even if the owner renames it.
const newId = () => `f_${Math.random().toString(36).slice(2, 8)}`;

export function WidgetEditor({ projectId, initial }: { projectId: string; initial: WidgetSettings }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  const set = <K extends keyof WidgetSettings>(key: K, value: WidgetSettings[K]) => {
    setS((cur) => ({ ...cur, [key]: value }));
    setJustSaved(false);
  };
  const setField = (id: string, patch: Partial<FormField>) =>
    set("formFields", s.formFields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const moveField = (index: number, dir: -1 | 1) => {
    const next = [...s.formFields];
    const [item] = next.splice(index, 1);
    next.splice(index + dir, 0, item);
    set("formFields", next);
  };

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveWidget(projectId, s);
      if (res.ok) {
        setSaved(s);
        setJustSaved(true);
      } else setError(res.error);
    });
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-3">
        {/* Appearance */}
        <div className={card}>
          <h3 className="text-sm font-semibold">Appearance</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Labeled label="Heading">
              <input value={s.widgetTitle} maxLength={60} onChange={(e) => set("widgetTitle", e.target.value)} className={input} />
            </Labeled>
            <Labeled label="Launcher button text">
              <input value={s.launcherText} maxLength={24} onChange={(e) => set("launcherText", e.target.value)} className={input} />
            </Labeled>
            <Labeled label="Subheading" className="sm:col-span-2">
              <input value={s.widgetSubtitle} maxLength={120} onChange={(e) => set("widgetSubtitle", e.target.value)} className={input} />
            </Labeled>
            <Labeled label="Accent colour" className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use ${c}`}
                    aria-pressed={s.accentColor === c}
                    onClick={() => set("accentColor", c)}
                    className="size-7 rounded-full transition hover:scale-110"
                    style={{ background: c, boxShadow: s.accentColor === c ? `0 0 0 2px var(--card), 0 0 0 4px ${c}` : undefined }}
                  />
                ))}
                <label className="ml-1 flex items-center gap-2 rounded-xl border border-border bg-background py-1 pr-3 pl-1">
                  <input
                    type="color"
                    value={s.accentColor}
                    onChange={(e) => set("accentColor", e.target.value)}
                    className="size-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    aria-label="Custom colour"
                  />
                  <span className="font-mono text-xs text-muted">{s.accentColor}</span>
                </label>
              </div>
            </Labeled>
          </div>
        </div>

        {/* Form */}
        <div className={card}>
          <h3 className="text-sm font-semibold">Suggestion form</h3>
          <p className="mt-0.5 text-sm text-muted">The idea title is always asked. Add your own questions below it.</p>

          <div className="mt-4 rounded-xl border border-border bg-subtle/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
              <span className="rounded bg-foreground/10 px-1.5 py-0.5">Built-in</span> Idea title · required
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={s.titleLabel} maxLength={60} onChange={(e) => set("titleLabel", e.target.value)} placeholder="Label" className={input} />
              <input
                value={s.titlePlaceholder}
                maxLength={80}
                onChange={(e) => set("titlePlaceholder", e.target.value)}
                placeholder="Placeholder"
                className={input}
              />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.showDescription}
                onChange={(e) => set("showDescription", e.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Also ask for optional details (long text)
            </label>
          </div>

          <ul className="mt-3 flex flex-col gap-3">
            {s.formFields.map((f, i) => (
              <li key={f.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={f.type}
                    onChange={(e) => {
                      const type = e.target.value as FieldType;
                      setField(f.id, { type, options: type === "select" ? (f.options?.length ? f.options : ["Option 1", "Option 2"]) : undefined });
                    }}
                    className={`${input} w-auto`}
                    aria-label="Field type"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {FIELD_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => setField(f.id, { required: e.target.checked })}
                      className="size-4 accent-[var(--accent)]"
                    />
                    Required
                  </label>
                  <div className="ml-auto flex items-center gap-0.5 text-muted">
                    <IconBtn label="Move up" disabled={i === 0} onClick={() => moveField(i, -1)}>
                      ↑
                    </IconBtn>
                    <IconBtn label="Move down" disabled={i === s.formFields.length - 1} onClick={() => moveField(i, 1)}>
                      ↓
                    </IconBtn>
                    <IconBtn label="Remove field" onClick={() => set("formFields", s.formFields.filter((x) => x.id !== f.id))}>
                      <X />
                    </IconBtn>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    value={f.label}
                    maxLength={60}
                    onChange={(e) => setField(f.id, { label: e.target.value })}
                    placeholder="Question, e.g. Which plan are you on?"
                    className={input}
                    aria-label="Field label"
                  />
                  {f.type !== "select" && (
                    <input
                      value={f.placeholder ?? ""}
                      maxLength={80}
                      onChange={(e) => setField(f.id, { placeholder: e.target.value || undefined })}
                      placeholder="Placeholder (optional)"
                      className={input}
                      aria-label="Field placeholder"
                    />
                  )}
                </div>
                {f.type === "select" && (
                  <OptionsEditor options={f.options ?? []} onChange={(options) => setField(f.id, { options })} />
                )}
              </li>
            ))}
          </ul>

          {s.formFields.length < MAX_FIELDS ? (
            <button
              type="button"
              onClick={() => set("formFields", [...s.formFields, { id: newId(), label: "", type: "text", required: false }])}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted transition hover:border-accent hover:text-accent"
            >
              <Plus /> Add a question
            </button>
          ) : (
            <p className="mt-3 text-center text-sm text-muted">Up to {MAX_FIELDS} custom questions.</p>
          )}
        </div>

        {/* Save bar: sticky so it's reachable while editing a long form */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-lg backdrop-blur">
          <span className="text-sm">
            {error ? (
              <span className="text-red-600 dark:text-red-400">{error}</span>
            ) : justSaved ? (
              <span className="inline-flex items-center gap-1.5 text-done">
                <Check /> Saved. Live on your site.
              </span>
            ) : dirty ? (
              <span className="text-muted">Unsaved changes</span>
            ) : (
              <span className="text-muted">All changes saved</span>
            )}
          </span>
          <div className="flex gap-2">
            {dirty && (
              <button
                type="button"
                onClick={() => {
                  setS(saved);
                  setError(null);
                }}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      <Preview s={s} />
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !options.includes(v) && options.length < 20) onChange([...options, v]);
    setDraft("");
  };
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <span key={o} className="inline-flex items-center gap-1 rounded-lg bg-subtle py-1 pr-1 pl-2.5 text-xs font-medium">
            {o}
            <button type="button" aria-label={`Remove ${o}`} onClick={() => onChange(options.filter((x) => x !== o))} className="text-muted hover:text-red-600">
              <X />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add an option and press Enter"
          className={input}
        />
        <button type="button" onClick={add} className="shrink-0 rounded-xl border border-border px-3 text-sm font-medium hover:border-foreground/30">
          Add
        </button>
      </div>
    </div>
  );
}

// A static mock of the real widget's "Suggest" tab, driven by unsaved state.
function Preview({ s }: { s: WidgetSettings }) {
  const [tab, setTab] = useState<"board" | "new">("new");
  const accent = s.accentColor;
  return (
    <div className="xl:sticky xl:top-20 xl:self-start">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
        <span>Live preview</span>
        <span>unsaved changes included</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-white text-[13px] text-[#111114] shadow-xl">
        <div className="px-4 pt-4 pb-3" style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 16%, transparent), transparent 70%)` }}>
          <div className="text-[15px] font-semibold">{s.widgetTitle || "Heading"}</div>
          {s.widgetSubtitle && <div className="mt-0.5 text-[12px] text-[#6b6b76]">{s.widgetSubtitle}</div>}
          <div className="mt-3 grid grid-cols-2 rounded-lg bg-[#f5f4f0] p-0.5 text-[12px] font-medium">
            {(["board", "new"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-md py-1 ${tab === k ? "bg-white shadow-sm" : "text-[#6b6b76]"}`}
              >
                {k === "board" ? "Ideas" : "Suggest"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex max-h-[380px] min-h-[220px] flex-col gap-2.5 overflow-y-auto px-4 pb-4">
          {tab === "board" ? (
            [
              ["Export reports to Excel", 128],
              ["Dark mode", 71],
            ].map(([t, v]) => (
              <div key={t} className="flex items-center gap-2.5 rounded-lg border border-[#ebe9e4] p-2.5">
                <span className="flex w-9 flex-col items-center rounded-md border border-[#ebe9e4] py-1 text-[11px] font-semibold text-[#6b6b76]">
                  <ArrowUp /> {v}
                </span>
                <span className="font-semibold">{t}</span>
              </div>
            ))
          ) : (
            <>
              <PreviewField label={s.titleLabel || "Your idea"} required>
                <div className="rounded-md border border-[#ebe9e4] px-2.5 py-1.5 text-[#a3a3ab]">{s.titlePlaceholder || " "}</div>
              </PreviewField>
              {s.showDescription && (
                <PreviewField label="Details">
                  <div className="h-12 rounded-md border border-[#ebe9e4]" />
                </PreviewField>
              )}
              {s.formFields.map((f) => (
                <PreviewField key={f.id} label={f.label || "Untitled question"} required={f.required}>
                  {f.type === "select" ? (
                    <div className="flex justify-between rounded-md border border-[#ebe9e4] px-2.5 py-1.5 text-[#a3a3ab]">
                      {f.options?.[0] ?? "Choose…"} <span>▾</span>
                    </div>
                  ) : f.type === "textarea" ? (
                    <div className="h-12 rounded-md border border-[#ebe9e4] px-2.5 py-1.5 text-[#a3a3ab]">{f.placeholder}</div>
                  ) : (
                    <div className="rounded-md border border-[#ebe9e4] px-2.5 py-1.5 text-[#a3a3ab]">{f.placeholder || " "}</div>
                  )}
                </PreviewField>
              ))}
              <div className="mt-1 rounded-md py-2 text-center font-semibold text-white" style={{ background: accent }}>
                Post idea
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white"
          style={{ background: accent, boxShadow: `0 10px 30px -8px ${accent}` }}
        >
          <Message /> {s.launcherText || "Feedback"}
        </span>
      </div>
    </div>
  );
}

function PreviewField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">
        {label}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </span>
      {children}
    </div>
  );
}

function Labeled({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium ${className}`}>
      {label}
      {children}
    </label>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-lg transition hover:bg-subtle hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}
