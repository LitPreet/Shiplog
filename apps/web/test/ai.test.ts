import { afterEach, describe, expect, it, vi } from "vitest";
import { aiConfig, sseToText } from "../src/lib/ai";

// Obviously fake key, used only to test that keys never end up as the model.
const FAKE_KEY = "gsk_" + "TESTONLY".repeat(6) + "abcd";

describe("aiConfig", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("never uses or logs an API key pasted into AI_MODEL", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("AI_API_KEY", "gsk_fake");
    vi.stubEnv("AI_MODEL", FAKE_KEY);
    expect(aiConfig()?.model).toBe("qwen/qwen3.8-27b");
    expect(JSON.stringify(err.mock.calls)).not.toContain("TESTONLY");
    err.mockRestore();
  });

  it("strips quotes and whitespace pasted into dashboard env vars", () => {
    vi.stubEnv("AI_API_KEY", ' "gsk_fake" ');
    vi.stubEnv("AI_MODEL", "'qwen/qwen3.8-27b'\n");
    expect(aiConfig()).toMatchObject({ apiKey: "gsk_fake", model: "qwen/qwen3.8-27b", baseUrl: "https://api.groq.com/openai/v1" });
  });

  it("keeps real model ids untouched", () => {
    vi.stubEnv("AI_API_KEY", "gsk_fake");
    for (const id of ["qwen/qwen3.8-27b", "openai/gpt-oss-20b", "llama3.1:8b", "llama-3.3-70b-versatile"]) {
      vi.stubEnv("AI_MODEL", id);
      expect(aiConfig()?.model).toBe(id);
    }
  });
});

// Feed raw byte chunks through the SSE parser and collect the text it emits.
async function run(chunks: string[]) {
  const enc = new TextEncoder();
  const source = new ReadableStream<Uint8Array>({
    start(c) {
      chunks.forEach((s) => c.enqueue(enc.encode(s)));
      c.close();
    },
  });
  const out = source.pipeThrough(sseToText()).getReader();
  const dec = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await out.read();
    if (done) return text;
    text += dec.decode(value);
  }
}

const event = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

describe("sseToText", () => {
  it("joins streamed deltas into text and stops at [DONE]", async () => {
    expect(await run([event("Hel"), event("lo"), "data: [DONE]\n\n"])).toBe("Hello");
  });

  it("handles an event split across network chunks", async () => {
    const whole = event("Top themes");
    expect(await run([whole.slice(0, 17), whole.slice(17)])).toBe("Top themes");
  });

  it("ignores keep-alive comments, empty deltas and malformed lines", async () => {
    const text = await run([": keep-alive\n\n", `data: {"choices":[{"delta":{}}]}\n\n`, "data: {not json\n\n", event("ok")]);
    expect(text).toBe("ok");
  });
});
