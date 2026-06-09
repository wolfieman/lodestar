// Pipeline integration tests that run in the DEFAULT Node environment by calling
// the Worker's exported fetch handler directly with a stub Env.
//
// Why not SELF.fetch here: this default suite stays Node-native (no workerd) for
// speed and portability. The same scenarios also run through real workerd in
// test/chat.workers.test.ts (vitest.workers.config.ts). These
// assertions exercise the REAL pipeline (chat.ts -> bm25/prompt/safety/mock/sse)
// — only the Cloudflare runtime shell and the live ratelimit binding are stubbed.
// The injected stub limiter implements the documented 12/60s policy, so the 429
// path (red-team change #12) is exercised even without workerd.
//
// Globals used (Request/Response/ReadableStream/TextEncoder/URL) are all standard
// in Node 18+, so the handler runs unmodified outside workerd. TEST_MODE=true
// means zero network and no @anthropic-ai/sdk code path is touched.

import { describe, expect, it } from "vitest";

import worker from "../src/index";
import { BM25Retriever } from "../src/bm25";
import { mockAgentReply } from "../src/mock";
import { formatSnippets } from "../src/prompt";
import type {
  AiBinding,
  AssetsFetcher,
  Env,
  RateLimit,
  Snippet,
  VectorizeBinding,
} from "../src/types";
import knowledge from "../../data/knowledge.json";

const KB = knowledge as Snippet[];

const PII_BLOCK_DETAIL =
  "That looks like it includes personal info (an email, phone number, or SSN). " +
  "Lodestar never needs it — take it out and send again.";

/** Stub limiter enforcing the real 12/60s policy in-memory (per-key sliding count). */
function stubLimiter(limit = 12): RateLimit {
  const counts = new Map<string, number>();
  return {
    limit({ key }: { key: string }) {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return Promise.resolve({ success: n <= limit });
    },
  };
}

/** A throwing limiter to prove fail-open behavior. */
function throwingLimiter(): RateLimit {
  return {
    limit() {
      return Promise.reject(new Error("binding outage"));
    },
  };
}

/** Stub assets binding that echoes back the (rewritten) request path. */
function stubAssets(): AssetsFetcher {
  return {
    fetch(request: Request) {
      const { pathname } = new URL(request.url);
      return Promise.resolve(new Response(`asset:${pathname}`, { status: 200 }));
    },
  };
}

/** Offline stubs for the dense-retrieval bindings (TEST_MODE never calls them;
 *  live-path tests inject throwing variants to prove BM25 degradation). */
function stubAi(): AiBinding {
  return {
    run() {
      return Promise.reject(new Error("AI binding not available in tests"));
    },
  };
}

function stubVectorize(): VectorizeBinding {
  return {
    query() {
      return Promise.reject(new Error("Vectorize not available in tests"));
    },
  };
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    TEST_MODE: "true",
    LODESTAR_MODEL: "claude-haiku-4-5-20251001",
    MAX_TOKENS: "1024",
    RATE_LIMITER: stubLimiter(),
    ASSETS: stubAssets(),
    AI: stubAi(),
    VECTORIZE: stubVectorize(),
    ...overrides,
  };
}

function get(path: string, env: Env): Promise<Response> {
  return worker.fetch(new Request(`https://worker.test${path}`), env);
}

function postChat(message: unknown, env: Env, ip = "1.2.3.4"): Promise<Response> {
  return worker.fetch(
    new Request("https://worker.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify({ message }),
    }),
    env,
  );
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

describe("GET /health", () => {
  it("returns 200 {status:ok}", async () => {
    const r = await get("/health", makeEnv());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: "ok" });
  });
});

describe("404", () => {
  it("unknown path -> 404 JSON", async () => {
    const r = await get("/nope", makeEnv());
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ detail: "Not found." });
  });
});

describe("POST /api/chat validation", () => {
  it("empty/whitespace message -> 400 exact wsgi.py detail", async () => {
    const r = await postChat("   ", makeEnv());
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({
      detail: "Message must be 1-1000 characters.",
    });
  });

  it("1000 code points is accepted (boundary)", async () => {
    const r = await postChat("a".repeat(1000), makeEnv());
    expect(r.status).toBe(200);
    await r.text();
  });

  it("1001 CODE POINTS of a multi-byte char -> 400 (code-point length)", async () => {
    // U+1F600 is a surrogate pair: .length === 2002 but code-point count === 1001.
    const message = "\u{1F600}".repeat(1001);
    expect(message.length).toBe(2002); // sanity: UTF-16 units differ from code points
    const r = await postChat(message, makeEnv());
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({
      detail: "Message must be 1-1000 characters.",
    });
  });

  it("1000 code points of a multi-byte char is accepted (boundary)", async () => {
    const r = await postChat("\u{1F600}".repeat(1000), makeEnv());
    expect(r.status).toBe(200);
    await r.text();
  });

  it("malformed JSON body -> 400 (tolerant parse -> empty message)", async () => {
    const r = await worker.fetch(
      new Request("https://worker.test/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
      makeEnv(),
    );
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({
      detail: "Message must be 1-1000 characters.",
    });
  });
});

describe("POST /api/chat PII gate", () => {
  it("email -> 400 with the exact PII_BLOCK_DETAIL (em dash intact)", async () => {
    const r = await postChat("reach me at student@example.edu", makeEnv());
    expect(r.status).toBe(400);
    const body = (await r.json()) as { detail: string };
    expect(body.detail).toBe(PII_BLOCK_DETAIL);
    expect(body.detail).toContain("—"); // U+2014, not a hyphen
  });

  it("phone -> 400", async () => {
    const r = await postChat("call 919-555-1234", makeEnv());
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ detail: PII_BLOCK_DETAIL });
  });

  it("ssn -> 400", async () => {
    const r = await postChat("my ssn is 123-45-6789", makeEnv());
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ detail: PII_BLOCK_DETAIL });
  });
});

describe("POST /api/chat TEST_MODE streaming", () => {
  it("streams [TEST_MODE] deltas + done as text/event-stream", async () => {
    const r = await postChat("How do I write a resume?", makeEnv());
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/event-stream");
    expect(r.headers.get("cache-control")).toBe("no-cache, no-transform");

    const body = await readSse(r);
    expect(body).toContain("event: delta");
    expect(body).toContain("event: done");
    expect(body.endsWith("\n\n")).toBe(true);

    // Reassemble the delta text -> exact MockProvider.run_tools parity
    // (mock.py:30-46): first tool called with the raw message, result preview
    // sliced to 160 code points. Expected computed via the same helpers.
    const text = [...body.matchAll(/event: delta\ndata: (.*)\n/g)]
      .map((m) => (JSON.parse(m[1]) as { text: string }).text)
      .join("");
    const result =
      formatSnippets(new BM25Retriever(KB).retrieve("How do I write a resume?", 4)) ||
      "No matching knowledge found.";
    expect(text).toBe(mockAgentReply("retrieve_knowledge", result));
    expect(text.startsWith("[TEST_MODE agent] called tool 'retrieve_knowledge'.")).toBe(true);

    // done payload: pii [] (mock text has none) and a stop_reason field present.
    const doneMatch = body.match(/event: done\ndata: (.*)\n/)!;
    const done = JSON.parse(doneMatch[1]) as {
      pii: string[];
      stop_reason: string | null;
    };
    expect(done.pii).toEqual([]);
    expect(done).toHaveProperty("stop_reason");
  });

  it("a query with no KB hits previews the no-match tool result", async () => {
    const r = await postChat("zzqqxx flibbertigibbet", makeEnv());
    expect(r.status).toBe(200);
    const body = await readSse(r);
    const text = [...body.matchAll(/event: delta\ndata: (.*)\n/g)]
      .map((m) => (JSON.parse(m[1]) as { text: string }).text)
      .join("");
    expect(text).toBe(
      "[TEST_MODE agent] called tool 'retrieve_knowledge'. " +
        "Result preview: No matching knowledge found.",
    );
  });

  it("streams the reply in multiple delta chunks (~4)", async () => {
    const r = await postChat("Tell me about internships", makeEnv());
    const body = await readSse(r);
    const deltaCount = [...body.matchAll(/event: delta\n/g)].length;
    expect(deltaCount).toBeGreaterThanOrEqual(2);
    expect(deltaCount).toBeLessThanOrEqual(4);
  });
});

describe("POST /api/chat rate limiting", () => {
  it("13th rapid request from one IP -> 429 with exact detail", async () => {
    const env = makeEnv(); // fresh stub limiter, limit 12
    let last = 0;
    for (let i = 0; i < 13; i++) {
      const r = await postChat("internships?", env, "9.9.9.9");
      last = r.status;
      await r.text();
    }
    expect(last).toBe(429);
    // Re-issue a 13th-equivalent to read the body deterministically.
    const r = await postChat("internships?", env, "9.9.9.9");
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({
      detail: "Rate limit exceeded; try again shortly.",
    });
  });

  it("separate IPs are counted independently", async () => {
    const env = makeEnv();
    for (let i = 0; i < 12; i++) {
      await (await postChat("q", env, "1.1.1.1")).text();
    }
    // 13th for 1.1.1.1 is limited, but a different IP is still allowed.
    const blocked = await postChat("q", env, "1.1.1.1");
    expect(blocked.status).toBe(429);
    await blocked.text();
    const allowed = await postChat("q", env, "2.2.2.2");
    expect(allowed.status).toBe(200);
    await allowed.text();
  });

  it("fails OPEN when the limiter throws (serves the request)", async () => {
    const env = makeEnv({ RATE_LIMITER: throwingLimiter() });
    const r = await postChat("How do I network?", env);
    expect(r.status).toBe(200); // degraded to no-limit, not an outage
    await r.text();
  });
});

describe("GET /static/* passthrough", () => {
  it("rewrites the Flask path scheme to root-served asset paths", async () => {
    const r = await get("/static/favicon.svg", makeEnv());
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("asset:/favicon.svg");
  });

  it("rewrites nested paths (fonts)", async () => {
    const r = await get("/static/fonts/inter-latin.woff2", makeEnv());
    expect(await r.text()).toBe("asset:/fonts/inter-latin.woff2");
  });
});
