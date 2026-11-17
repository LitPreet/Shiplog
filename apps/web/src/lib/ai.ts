// Provider-agnostic LLM client. Groq, Ollama, OpenRouter (and OpenAI) all
// speak the same "OpenAI-compatible" chat API, so switching provider is a
// config change, not a code change:
//
//   local (free, offline):  AI_BASE_URL=http://localhost:11434/v1  AI_MODEL=llama3.2
//   production (Groq):      AI_API_KEY=gsk_...  (AI_BASE_URL defaults to Groq)  AI_MODEL=<groq model id>
//
// No AI configured? aiConfig() returns null and every caller falls back to
// non-AI behaviour. The app never depends on the model being up.

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "qwen/qwen3.8-27b"; // Groq. Evaluated 11/12 on scripts/eval-duplicates.ts, ~0.25s.

export type AiConfig = { baseUrl: string; model: string; apiKey?: string };

// Env values pasted into dashboards often carry stray quotes or whitespace
// ("gsk_..." or a trailing newline), which silently breaks auth.
const clean = (v: string | undefined) => v?.trim().replace(/^["']|["']$/g, "").trim() || undefined;

// Catches an API key pasted into the wrong variable (AI_MODEL) before it is
// sent to the provider as a model name or written to logs. Keys look like
// "gsk_...", "sk-...", or long random strings; model ids contain "/", "-", ":" or ".".
const looksLikeSecret = (v: string) =>
  /^(gsk_|sk-|sk_|xai-)/i.test(v) || (/^[A-Za-z0-9_]{32,}$/.test(v) && !/[/:.-]/.test(v));

export function aiConfig(): AiConfig | null {
  const apiKey = clean(process.env.AI_API_KEY);
  const baseUrl = clean(process.env.AI_BASE_URL) || (apiKey ? GROQ_BASE_URL : "");
  if (!baseUrl) return null;
  let model = clean(process.env.AI_MODEL) || DEFAULT_MODEL;
  if (looksLikeSecret(model)) {
    console.error("[ai] AI_MODEL looks like an API key; ignoring it and using the default model. Put the key in AI_API_KEY.");
    model = DEFAULT_MODEL;
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), model, apiKey };
}

export type Message = { role: "system" | "user" | "assistant"; content: string };

export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

async function post(cfg: AiConfig, body: object, signal: AbortSignal) {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cfg.apiKey && { Authorization: `Bearer ${cfg.apiKey}` }),
    },
    body: JSON.stringify({ model: cfg.model, ...body }),
    signal,
  });
  if (!res.ok) {
    // Log the provider's reason server-side (Vercel → Logs) so failures are
    // diagnosable: bad key (401), unknown model (404), rate limit (429)...
    // Never sent to clients, and never includes our key.
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    console.error(`[ai] ${res.status} from ${new URL(cfg.baseUrl).host} (model "${cfg.model}"): ${detail}`);
    throw new AiError(`AI provider returned ${res.status}`, res.status);
  }
  return res;
}

// One-shot call that must return a JSON object. temperature 0 keeps
// classification answers stable; the timeout keeps the UI snappy (callers
// fall back if the model is slow).
export async function chatJson(
  messages: Message[],
  { timeoutMs = 5000, maxTokens = 300 }: { timeoutMs?: number; maxTokens?: number } = {},
): Promise<unknown> {
  const cfg = aiConfig();
  if (!cfg) throw new AiError("AI is not configured");
  const res = await post(
    cfg,
    { messages, temperature: 0, max_tokens: maxTokens, response_format: { type: "json_object" } },
    AbortSignal.timeout(timeoutMs),
  );
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiError("Empty AI response");
  try {
    return JSON.parse(content);
  } catch {
    throw new AiError("AI returned invalid JSON");
  }
}

// Streaming call: returns a stream of plain text, token by token.
export async function chatStream(
  messages: Message[],
  { signal, maxTokens = 700 }: { signal?: AbortSignal; maxTokens?: number } = {},
): Promise<ReadableStream<Uint8Array>> {
  const cfg = aiConfig();
  if (!cfg) throw new AiError("AI is not configured");
  const timeout = AbortSignal.timeout(45_000);
  const res = await post(
    cfg,
    { messages, temperature: 0.3, max_tokens: maxTokens, stream: true },
    signal ? AbortSignal.any([signal, timeout]) : timeout,
  );
  if (!res.body) throw new AiError("No response body");
  return res.body.pipeThrough(sseToText());
}

// The provider streams Server-Sent Events: lines like
//   data: {"choices":[{"delta":{"content":"Hel"}}]}
//   data: [DONE]
// A network chunk can end mid-line, so we buffer until each newline.
export function sseToText(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const handleLine = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") return;
    try {
      const text = JSON.parse(payload)?.choices?.[0]?.delta?.content;
      if (typeof text === "string" && text) controller.enqueue(encoder.encode(text));
    } catch {
      // Ignore keep-alive comments or malformed lines.
    }
  };

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) handleLine(line, controller);
    },
    flush(controller) {
      if (buffer) handleLine(buffer, controller);
    },
  });
}
