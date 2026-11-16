import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Api, FeedbackItem, FeedbackStatus } from "./api";

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  OPEN: "Open",
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CLOSED: "Closed",
};

type Tab = "board" | "new";

export function App({ api }: { api: Api }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("board");
  const [items, setItems] = useState<FeedbackItem[] | null>(null); // null = not loaded yet
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(() => {
    setLoadError(null);
    api
      .list()
      .then((res) => setItems(res.items))
      .catch((err: Error) => setLoadError(err.message));
  }, [api]);

  // Lazy: only fetch when the panel is first opened. Most visitors never open
  // the widget, so we don't hit the API on every page view.
  useEffect(() => {
    if (open && items === null) load();
  }, [open, items, load]);

  // Escape closes the panel and returns focus to the launcher (accessibility).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // OPTIMISTIC UPDATE: flip the vote in the UI instantly, then confirm with the
  // server. If the request fails, restore that one item and tell the user.
  // We intentionally do NOT re-sort after voting: items jumping under the
  // user's cursor is a bad experience. The order refreshes on next open.
  async function handleVote(item: FeedbackItem) {
    const optimistic = {
      ...item,
      hasVoted: !item.hasVoted,
      voteCount: item.voteCount + (item.hasVoted ? -1 : 1),
    };
    setItems((cur) => cur?.map((i) => (i.id === item.id ? optimistic : i)) ?? cur);
    try {
      const res = await api.toggleVote(item.id);
      setItems((cur) => cur?.map((i) => (i.id === item.id ? { ...i, ...res } : i)) ?? cur);
    } catch (err) {
      setItems((cur) => cur?.map((i) => (i.id === item.id ? item : i)) ?? cur);
      setToast((err as Error).message);
    }
  }

  async function handleCreate(input: { title: string; description?: string }) {
    const { item } = await api.create(input); // errors are shown by the form
    setItems((cur) => [item, ...(cur ?? [])]);
    setTab("board");
    setToast("Thanks! Your idea was posted.");
  }

  return (
    <div class="sl">
      {open && (
        <section class="panel" role="dialog" aria-label="Feedback">
          <header class="panel-header">
            <strong>Feedback</strong>
            <button class="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
              ✕
            </button>
          </header>

          <nav class="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "board"} class={tab === "board" ? "tab active" : "tab"} onClick={() => setTab("board")}>
              Ideas
            </button>
            <button role="tab" aria-selected={tab === "new"} class={tab === "new" ? "tab active" : "tab"} onClick={() => setTab("new")}>
              Suggest
            </button>
          </nav>

          <div class="panel-body">
            {tab === "board" ? (
              <Board items={items} error={loadError} onRetry={load} onVote={handleVote} onSuggest={() => setTab("new")} />
            ) : (
              <NewIdeaForm onSubmit={handleCreate} />
            )}
          </div>

          {toast && <div class="toast" role="status">{toast}</div>}
        </section>
      )}

      <button
        ref={launcherRef}
        class="launcher"
        aria-expanded={open}
        aria-label={open ? "Close feedback" : "Open feedback"}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "✕" : "💬 Feedback"}
      </button>
    </div>
  );
}

function Board(props: {
  items: FeedbackItem[] | null;
  error: string | null;
  onRetry: () => void;
  onVote: (item: FeedbackItem) => void;
  onSuggest: () => void;
}) {
  const { items, error } = props;

  if (error) {
    return (
      <div class="state">
        <p>Couldn't load ideas: {error}</p>
        <button class="btn" onClick={props.onRetry}>Try again</button>
      </div>
    );
  }

  if (items === null) {
    // Skeleton rows instead of a spinner: the layout doesn't jump on load.
    return (
      <ul class="list" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li key={i} class="item skeleton" />
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <div class="state">
        <p>No ideas yet. Be the first!</p>
        <button class="btn" onClick={props.onSuggest}>Suggest an idea</button>
      </div>
    );
  }

  return (
    <ul class="list">
      {items.map((item) => (
        <li key={item.id} class="item">
          <button
            class={item.hasVoted ? "vote voted" : "vote"}
            aria-pressed={item.hasVoted}
            aria-label={`${item.hasVoted ? "Remove vote from" : "Vote for"} ${item.title}`}
            onClick={() => props.onVote(item)}
          >
            <span aria-hidden="true">▲</span>
            <span>{item.voteCount}</span>
          </button>
          <div class="item-text">
            <div class="item-title">{item.title}</div>
            {item.description && <div class="item-desc">{item.description}</div>}
            {item.status !== "OPEN" && (
              <span class={`badge badge-${item.status.toLowerCase()}`}>{STATUS_LABEL[item.status]}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function NewIdeaForm({ onSubmit }: { onSubmit: (input: { title: string; description?: string }) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: Event) {
    e.preventDefault();
    if (title.trim().length < 3) {
      setError("Please write a short title (3+ characters).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title: title.trim(), description: description.trim() || undefined });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form class="form" onSubmit={submit}>
      <label>
        <span>Your idea</span>
        <input
          value={title}
          maxLength={120}
          placeholder="e.g. Export reports to Excel"
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          autoFocus
        />
      </label>
      <label>
        <span>Details (optional)</span>
        <textarea
          rows={4}
          value={description}
          maxLength={2000}
          placeholder="What problem would this solve for you?"
          onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
        />
      </label>
      {error && <p class="error" role="alert">{error}</p>}
      <button class="btn primary" type="submit" disabled={submitting}>
        {submitting ? "Posting…" : "Post idea"}
      </button>
    </form>
  );
}
