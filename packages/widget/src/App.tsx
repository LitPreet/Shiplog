import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { Api, FeedbackItem, FeedbackStatus, FormField, NewIdea, SimilarIdea, WidgetConfig } from "./api";

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  OPEN: "Open",
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  DONE: "Shipped",
  CLOSED: "Closed",
};

type Tab = "board" | "new";

export function App({ api, settings }: { api: Api; settings: WidgetConfig }) {
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

  async function handleCreate(input: NewIdea) {
    const { item } = await api.create(input); // errors are shown by the form
    setItems((cur) => [item, ...(cur ?? [])]);
    setTab("board");
    setToast("Thanks! Your idea was posted.");
  }

  return (
    <div class={`sl theme-${settings.theme}`}>
      {open && (
        <section class="panel" role="dialog" aria-label="Feedback">
          <header class="panel-header">
            <div>
              <strong>{settings.title}</strong>
              {settings.subtitle && <p class="subtitle">{settings.subtitle}</p>}
            </div>
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
              <NewIdeaForm
                api={api}
                settings={settings}
                onSubmit={handleCreate}
                onVoted={(msg) => {
                  setItems(null); // board refetches with the new vote next time it's shown
                  setTab("board");
                  setToast(msg);
                }}
              />
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
        {open ? "✕" : `💬 ${settings.launcherText}`}
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
            aria-label={`${item.voteCount} votes. ${item.hasVoted ? "Remove vote from" : "Vote for"} ${item.title}`}
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

function NewIdeaForm(props: {
  api: Api;
  settings: WidgetConfig;
  onSubmit: (input: NewIdea) => Promise<void>;
  onVoted: (message: string) => void;
}) {
  const { api, settings, onSubmit } = props;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Custom field values keyed by field id, exactly what the API expects.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Live "similar ideas" while typing (text match), and AI-found duplicates on submit.
  const [similar, setSimilar] = useState<SimilarIdea[]>([]);
  const [duplicates, setDuplicates] = useState<SimilarIdea[] | null>(null);

  // Debounce (300ms) + cancel the previous request, so fast typing can't show
  // results for an older query that happened to arrive last.
  useEffect(() => {
    const q = title.trim();
    if (q.length < 3) {
      setSimilar([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(() => {
      api
        .similar(q, controller.signal)
        .then((res) => setSimilar(res.items))
        .catch(() => {}); // aborted or offline: keep quiet, it's only a hint
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [title, api]);

  async function vote(idea: SimilarIdea) {
    try {
      if (!idea.hasVoted) await api.toggleVote(idea.id);
      props.onVoted(`Voted for “${idea.title}”. Thanks!`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function validate() {
    if (title.trim().length < 3) return `${settings.titleLabel}: please write at least 3 characters.`;
    // Client-side check for a friendlier message; the server validates again.
    const missing = settings.fields.find((f) => f.required && !answers[f.id]?.trim());
    return missing ? `${missing.label} is required.` : null;
  }

  async function post() {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: (settings.showDescription && description.trim()) || undefined,
        answers,
      });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  async function submit(e: Event) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError(null);
    // Ask the AI whether this already exists. Any failure: just post.
    const found = await api
      .check({ title: title.trim(), description: description.trim() || undefined })
      .then((r) => r.duplicates)
      .catch(() => []);
    if (found.length > 0) {
      setDuplicates(found);
      setSubmitting(false);
      return;
    }
    await post();
  }

  if (duplicates) {
    return (
      <div class="dup" role="alertdialog" aria-labelledby="sl-dup-title">
        <p id="sl-dup-title" class="dup-title">
          This might already be on the board
        </p>
        <p class="dup-sub">Voting for an existing idea helps it get built sooner.</p>
        <ul class="similar-list">
          {duplicates.map((d) => (
            <SimilarRow key={d.id} idea={d} onVote={() => vote(d)} />
          ))}
        </ul>
        <div class="dup-actions">
          <button class="btn" type="button" onClick={() => setDuplicates(null)}>
            Edit my idea
          </button>
          <button
            class="btn primary"
            type="button"
            disabled={submitting}
            onClick={() => {
              setDuplicates(null);
              post();
            }}
          >
            {submitting ? "Posting…" : "Post mine anyway"}
          </button>
        </div>
        {error && <p class="error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <form class="form" onSubmit={submit} noValidate>
      <label>
        <span>
          {settings.titleLabel} <span class="req" aria-hidden="true">*</span>
        </span>
        <input
          value={title}
          maxLength={120}
          required
          placeholder={settings.titlePlaceholder}
          onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          autoFocus
        />
      </label>
      {similar.length > 0 && (
        <div class="similar" aria-live="polite">
          <p class="similar-title">Similar ideas: vote instead?</p>
          <ul class="similar-list">
            {similar.map((s) => (
              <SimilarRow key={s.id} idea={s} onVote={() => vote(s)} />
            ))}
          </ul>
        </div>
      )}
      {settings.showDescription && (
        <label>
          <span>
            Details <span class="hint">optional</span>
          </span>
          <textarea
            rows={3}
            value={description}
            maxLength={2000}
            placeholder="What problem would this solve for you?"
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
          />
        </label>
      )}
      {settings.fields.map((field) => (
        <CustomField
          key={field.id}
          field={field}
          value={answers[field.id] ?? ""}
          onChange={(v) => setAnswers((cur) => ({ ...cur, [field.id]: v }))}
        />
      ))}
      {error && <p class="error" role="alert">{error}</p>}
      <button class="btn primary" type="submit" disabled={submitting}>
        {submitting ? "Checking…" : "Post idea"}
      </button>
    </form>
  );
}

function SimilarRow({ idea, onVote }: { idea: SimilarIdea; onVote: () => void }) {
  return (
    <li class="similar-row">
      <span class="similar-name">{idea.title}</span>
      <span class="similar-meta">
        {idea.status !== "OPEN" && <span class={`badge badge-${idea.status.toLowerCase()}`}>{STATUS_LABEL[idea.status]}</span>}
        <button
          type="button"
          class={idea.hasVoted ? "mini-vote voted" : "mini-vote"}
          aria-label={`${idea.voteCount} votes. ${idea.hasVoted ? "You voted for" : "Vote for"} ${idea.title}`}
          onClick={onVote}
        >
          ▲ {idea.voteCount}
        </button>
      </span>
    </li>
  );
}

// Renders one owner-defined question. One component per type keeps the
// markup accessible (a real <label> around every control).
function CustomField({ field, value, onChange }: { field: FormField; value: string; onChange: (v: string) => void }) {
  const onInput = (e: Event) => onChange((e.target as HTMLInputElement).value);
  const common = { value, required: field.required, placeholder: field.placeholder ?? "" };

  let control;
  if (field.type === "textarea") {
    control = <textarea rows={3} maxLength={2000} {...common} onInput={onInput} />;
  } else if (field.type === "select") {
    control = (
      <select value={value} required={field.required} onChange={onInput}>
        <option value="">Choose…</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else {
    control = (
      <input
        type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
        inputMode={field.type === "number" ? "decimal" : undefined}
        maxLength={300}
        {...common}
        onInput={onInput}
      />
    );
  }

  return (
    <label>
      <span>
        {field.label}{" "}
        {field.required ? <span class="req" aria-hidden="true">*</span> : <span class="hint">optional</span>}
      </span>
      {control}
    </label>
  );
}
