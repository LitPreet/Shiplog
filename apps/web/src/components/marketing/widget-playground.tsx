"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { ArrowUp, Check, Message, Moon, X } from "../icons";

// A faithful, self-contained replica of the real widget for the landing page.
// It runs on local state (no API, no database), so visitors can play with it
// and see the theme + accent options without installing anything.

type Status = "OPEN" | "PLANNED" | "IN_PROGRESS" | "DONE";
type Idea = { id: number; title: string; desc?: string; votes: number; voted: boolean; status: Status };

const SEED: Idea[] = [
  { id: 1, title: "Export reports to Excel", desc: "Finance needs .xlsx exports every month-end.", votes: 128, voted: false, status: "PLANNED" },
  { id: 2, title: "Slack alerts for new invoices", votes: 94, voted: true, status: "IN_PROGRESS" },
  { id: 3, title: "Dark mode", desc: "Late-night bookkeeping is real.", votes: 71, voted: false, status: "DONE" },
  { id: 4, title: "Bulk-edit customer tags", votes: 38, voted: false, status: "OPEN" },
];

const STATUS: Record<Status, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "#8a8a94" },
  PLANNED: { label: "Planned", color: "#3b82f6" },
  IN_PROGRESS: { label: "In progress", color: "#f59e0b" },
  DONE: { label: "Shipped", color: "#22c55e" },
};

const ACCENTS = ["#ff5b2e", "#6d5dfc", "#0ea5e9", "#10b981", "#e11d74"];

const THEMES = {
  light: { bg: "#ffffff", fg: "#111114", muted: "#6b6b76", border: "#ebe9e4", soft: "#f5f4f0" },
  dark: { bg: "#151518", fg: "#f4f4f2", muted: "#9a9aa3", border: "#2a2a30", soft: "#1d1d21" },
};

type Filter = "ALL" | Status;
const FILTERS: Filter[] = ["ALL", "PLANNED", "IN_PROGRESS", "DONE"];

export function WidgetPlayground() {
  const [ideas, setIdeas] = useState(SEED);
  const [tab, setTab] = useState<"board" | "new">("board");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [theme, setTheme] = useState<keyof typeof THEMES>("light");
  const [bumped, setBumped] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const t = THEMES[theme];
  const vars = {
    "--pg-accent": accent,
    "--pg-bg": t.bg,
    "--pg-fg": t.fg,
    "--pg-muted": t.muted,
    "--pg-border": t.border,
    "--pg-soft": t.soft,
  } as CSSProperties;

  const visible = ideas.filter((i) => filter === "ALL" || i.status === filter);

  function vote(id: number) {
    setIdeas((cur) => cur.map((i) => (i.id === id ? { ...i, voted: !i.voted, votes: i.votes + (i.voted ? -1 : 1) } : i)));
    setBumped(id);
    setTimeout(() => setBumped(null), 320);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) return;
    setIdeas((cur) => [{ id: Date.now(), title: title.trim(), votes: 1, voted: true, status: "OPEN" }, ...cur]);
    setTitle("");
    setFilter("ALL");
    setTab("board");
    setToast("Thanks! Your idea was posted.");
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* The widget panel */}
      <div
        style={vars}
        className="relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-[var(--pg-border)] bg-[var(--pg-bg)] text-[14px] text-[var(--pg-fg)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] transition-colors"
      >
        <div
          className="relative px-5 pt-5 pb-4"
          style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 16%, transparent), transparent 70%)` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[16px] font-semibold tracking-tight">Share feedback</div>
              <div className="mt-0.5 text-[13px] text-[var(--pg-muted)]">Vote on ideas or suggest your own.</div>
            </div>
            <span className="grid size-7 place-items-center rounded-full text-[var(--pg-muted)]" aria-hidden="true">
              <X />
            </span>
          </div>
          <div role="tablist" className="mt-4 grid grid-cols-2 rounded-xl bg-[var(--pg-soft)] p-1 text-[13px] font-medium">
            {(["board", "new"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`rounded-lg py-1.5 transition ${tab === k ? "bg-[var(--pg-bg)] shadow-sm" : "text-[var(--pg-muted)]"}`}
              >
                {k === "board" ? `Ideas · ${ideas.length}` : "Suggest"}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[330px] overflow-y-auto px-4 pb-3">
          {tab === "board" ? (
            <>
              <div className="mb-3 flex gap-1.5 overflow-x-auto">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="shrink-0 rounded-full border px-2.5 py-1 text-[12px] font-medium transition"
                    style={
                      filter === f
                        ? { borderColor: accent, color: accent, background: `color-mix(in srgb, ${accent} 10%, transparent)` }
                        : { borderColor: t.border, color: t.muted }
                    }
                  >
                    {f === "ALL" ? "All" : STATUS[f].label}
                  </button>
                ))}
              </div>
              <ul className="flex flex-col gap-2">
                {visible.map((i) => (
                  <li key={i.id} className="flex gap-3 rounded-xl border border-[var(--pg-border)] p-3 transition hover:border-[color-mix(in_srgb,var(--pg-accent)_40%,var(--pg-border))]">
                    <button
                      onClick={() => vote(i.id)}
                      aria-pressed={i.voted}
                      aria-label={`${i.voted ? "Remove vote from" : "Vote for"} ${i.title}`}
                      className={`flex w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-[13px] font-semibold tabular-nums transition ${bumped === i.id ? "animate-bump" : ""}`}
                      style={
                        i.voted
                          ? { borderColor: accent, background: accent, color: "#fff" }
                          : { borderColor: t.border, color: t.muted }
                      }
                    >
                      <ArrowUp className="size-4" />
                      {i.votes}
                    </button>
                    <div className="min-w-0">
                      <div className="font-semibold leading-snug">{i.title}</div>
                      {i.desc && <div className="mt-0.5 text-[12.5px] text-[var(--pg-muted)]">{i.desc}</div>}
                      {i.status !== "OPEN" && (
                        <span
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ color: STATUS[i.status].color, background: `color-mix(in srgb, ${STATUS[i.status].color} 14%, transparent)` }}
                        >
                          <span className="size-1.5 rounded-full" style={{ background: STATUS[i.status].color }} />
                          {STATUS[i.status].label}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
                {visible.length === 0 && <li className="py-10 text-center text-[var(--pg-muted)]">Nothing here yet.</li>}
              </ul>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3 pt-1">
              <label className="flex flex-col gap-1.5 font-medium">
                Your idea
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Recurring invoices"
                  className="rounded-lg border border-[var(--pg-border)] bg-transparent px-3 py-2 font-normal outline-none focus:border-[var(--pg-accent)]"
                />
              </label>
              <label className="flex flex-col gap-1.5 font-medium">
                Details <span className="-mt-1.5 text-[12px] font-normal text-[var(--pg-muted)]">optional</span>
                <textarea
                  rows={4}
                  placeholder="What problem would this solve for you?"
                  className="resize-none rounded-lg border border-[var(--pg-border)] bg-transparent px-3 py-2 font-normal outline-none focus:border-[var(--pg-accent)]"
                />
              </label>
              <button
                type="submit"
                disabled={title.trim().length < 3}
                className="rounded-lg py-2.5 font-semibold text-white transition disabled:opacity-50"
                style={{ background: accent }}
              >
                Post idea
              </button>
            </form>
          )}
        </div>

        {toast && (
          <div className="absolute inset-x-4 bottom-12 flex items-center gap-2 rounded-lg bg-[var(--pg-fg)] px-3 py-2.5 text-[13px] text-[var(--pg-bg)] animate-rise">
            <Check className="text-[#22c55e]" /> {toast}
          </div>
        )}

        <div className="border-t border-[var(--pg-border)] py-2 text-center text-[11px] text-[var(--pg-muted)]">
          Powered by <span className="font-semibold text-[var(--pg-fg)]">Shiplog</span>
        </div>
      </div>

      {/* The launcher bubble that sits on the customer's page */}
      <div className="flex w-full max-w-[380px] items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/80 p-1.5 shadow-sm backdrop-blur">
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => setAccent(c)}
              aria-label={`Accent colour ${c}`}
              aria-pressed={accent === c}
              className="size-5 rounded-full ring-offset-2 ring-offset-card transition hover:scale-110"
              style={{ background: c, boxShadow: accent === c ? `0 0 0 2px var(--card), 0 0 0 4px ${c}` : undefined }}
            />
          ))}
          <span className="mx-0.5 h-4 w-px bg-border" />
          <button
            onClick={() => setTheme((v) => (v === "light" ? "dark" : "light"))}
            aria-label="Toggle widget theme"
            className="grid size-6 place-items-center rounded-full text-muted transition hover:text-foreground"
          >
            <Moon />
          </button>
        </div>
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg"
          style={{ background: accent, boxShadow: `0 10px 30px -8px ${accent}` }}
        >
          <Message className="size-4" /> Feedback
        </span>
      </div>
    </div>
  );
}
