import { describe, expect, it } from "vitest";
import { sseToText } from "../src/lib/ai";

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
