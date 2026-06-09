// Integration suite for the /api/chat pipeline, driven through workerd via
// @cloudflare/vitest-pool-workers' SELF.fetch (runtime fidelity: real assets
// routing, real env vars, real ratelimit binding).
//
// Run with:  npx vitest run --config vitest.workers.config.ts
//
// NOTE: @cloudflare/vitest-pool-workers@0.9.x crashes on Node 24
// (`vm._setUnsafeEval is not a function` in the bundled workerd runtime), so
// this *.workers.test.ts suite is excluded from the default Node-24 run and is
// executed by the CI `worker` job on Node 22 LTS. The SAME pipeline assertions
// run on every machine/Node via test/chat.test.ts, which invokes the Worker's
// fetch handler directly with a stub Env (including a stub rate limiter). When
// the toolchain is bumped to a Node-24-compatible pool, this becomes the
// canonical integration run.

import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const BASE = "https://worker.test";

async function postChat(message: unknown): Promise<Response> {
  return SELF.fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
}

async function readSse(r: Response): Promise<string> {
  const reader = r.body!.getReader();
  const dec = new TextDecoder();
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

describe("/health", () => {
  it("returns 200 {status:ok}", async () => {
    const r = await SELF.fetch(`${BASE}/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: "ok" });
  });
});

describe("/api/chat validation", () => {
  it("empty message -> 400 with exact wsgi.py detail", async () => {
    const r = await postChat("   ");
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({
      detail: "Message must be 1-1000 characters.",
    });
  });

  it("1001 CODE POINTS (multi-byte) -> 400 (code-point length, not UTF-16)", async () => {
    // 1001 astral chars: .length would be 2002 (surrogate pairs); the gate must
    // count code points, so this is rejected for being > 1000 characters.
    const message = "\u{1F600}".repeat(1001);
    const r = await postChat(message);
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({
      detail: "Message must be 1-1000 characters.",
    });
  });

  it("PII message -> 400 with the exact PII_BLOCK_DETAIL constant", async () => {
    const r = await postChat("email me at student@example.edu");
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({
      detail:
        "That looks like it includes personal info (an email, phone number, or SSN). " +
        "Lodestar never needs it — take it out and send again.",
    });
  });
});

describe("/api/chat TEST_MODE streaming", () => {
  it("streams [TEST_MODE] deltas + a done event as text/event-stream", async () => {
    const r = await postChat("How do I write a resume?");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/event-stream");
    expect(r.headers.get("cache-control")).toBe("no-cache, no-transform");

    const body = await readSse(r);
    expect(body).toContain("event: delta");
    expect(body).toContain("[TEST_MODE agent]");
    expect(body).toContain("event: done");
    // Reassemble delta text and confirm the MockProvider.run_tools wording
    // (the hosted TEST_MODE drives the agent, which calls the first tool).
    const text = [...body.matchAll(/event: delta\ndata: (.*)\n/g)]
      .map((m) => JSON.parse(m[1]).text)
      .join("");
    expect(
      text.startsWith("[TEST_MODE agent] called tool 'retrieve_knowledge'. Result preview: "),
    ).toBe(true);
  });
});

describe("404", () => {
  it("unknown path -> 404 JSON", async () => {
    const r = await SELF.fetch(`${BASE}/nope`);
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ detail: "Not found." });
  });
});

describe("rate limit", () => {
  it("13th rapid request -> 429 (real binding; limit 12/60s)", async () => {
    // The ratelimit binding is shared across the test isolate; fire 13 quickly.
    let last = 200;
    for (let i = 0; i < 13; i++) {
      const r = await postChat("quick question about internships");
      // Drain the body so the connection is released before the next call.
      await r.text();
      last = r.status;
    }
    expect(last).toBe(429);
  });
});
