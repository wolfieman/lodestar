// POST /api/chat — the lean hosted pipeline, mirroring wsgi.py:75-90 / web.py:78-87
// with streaming added (the locked "build streaming once" decision). Flow:
//
//   1. rate limit (env.RATE_LIMITER, keyed cf-connecting-ip; fail OPEN on throw)
//   2. tolerant JSON parse + validation (empty or >1000 code points -> 400)
//   3. PII input gate (-> 400 {detail: PII_BLOCK_DETAIL}, exact safety.py bytes)
//   4. BM25 top-4 over the 23-snippet KB -> formatSnippets -> buildSystem
//   5. TEST_MODE -> streamed mock; else one streaming Anthropic call
//   6. SSE response: delta* then done {pii, stop_reason}; mid-stream error -> error
//   7. pre-stream typed Anthropic errors -> 429/502 JSON (no key leakage)
//
// Single user turn, stateless per request — exactly like wsgi.py's fresh agent.
// The agent.py routing-hint sentence and tool-use loop are intentionally dropped
// (locked decision: the hosted build is a single grounded completion, not the
// agentic stack). detect_pii on the user message BLOCKS (parity with the Python
// servers on disk); detect_pii on the full reply is post-hoc and advisory,
// shipped in the `done` payload's `pii` array.

import Anthropic, {
  APIError,
  AuthenticationError,
  RateLimitError,
} from "@anthropic-ai/sdk";

import { BM25Retriever } from "./bm25";
import { chunkText, mockReply } from "./mock";
import { buildSystem, formatSnippets } from "./prompt";
import { detectPii, PII_BLOCK_DETAIL } from "./safety";
import {
  SSE_HEADERS,
  sendDelta,
  sendDone,
  sendError,
  type SseSink,
} from "./sse";
import type { Env, Snippet } from "./types";
import knowledge from "../../data/knowledge.json";

// Module-level KB + BM25 index: built once per isolate (sparse.py parity).
const SNIPPETS = knowledge as Snippet[];
const RETRIEVER = new BM25Retriever(SNIPPETS);

// config.py:13-18 truthy set, exact.
const TRUTHY = new Set(["1", "true", "yes", "on"]);

function isTruthy(value: string | undefined): boolean {
  return TRUTHY.has((value ?? "").trim().toLowerCase());
}

/** Exact wsgi.py wording/codes for the validation + rate-limit failures. */
const MSG_LENGTH = "Message must be 1-1000 characters.";
const MSG_RATE_LIMIT = "Rate limit exceeded; try again shortly.";
/** Generic upstream message — never leaks key/auth specifics to the client. */
const MSG_UPSTREAM = "Something went wrong on our end. Wait a moment and try again.";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Code-point length (NOT UTF-16 code-unit length): `[...s].length`. A 1001-char
 * message of astral chars (e.g. emoji) must be rejected by count of characters,
 * not by .length, which would double-count surrogate pairs. (red-team change.)
 */
function codePointLength(s: string): number {
  let n = 0;
  for (const _ of s) {
    n += 1;
  }
  return n;
}

export async function handleChat(request: Request, env: Env): Promise<Response> {
  // 1. Rate limit (per-IP). Fail OPEN: a limiter outage degrades to "no limit"
  //    (the Anthropic spend cap is the real cost backstop), never a chat outage.
  const ip = request.headers.get("cf-connecting-ip") ?? "?";
  try {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) {
      return json({ detail: MSG_RATE_LIMIT }, 429);
    }
  } catch (err) {
    console.error("rate limiter error (failing open):", err);
  }

  // 2. Tolerant JSON parse + validation (wsgi.py:81-84 parity).
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const rawMessage =
    body && typeof body === "object" && "message" in body
      ? (body as { message?: unknown }).message
      : undefined;
  const message = (typeof rawMessage === "string" ? rawMessage : "").trim();
  if (message.length === 0 || codePointLength(message) > 1000) {
    return json({ detail: MSG_LENGTH }, 400);
  }

  // 3. PII input gate — BLOCK with 400 (wsgi.py:85-86 / web.py:82-83 parity).
  if (detectPii(message).length > 0) {
    return json({ detail: PII_BLOCK_DETAIL }, 400);
  }

  // 4. Retrieval -> context -> system prompt (Responder/sparse/knowledge parity).
  const snippets = RETRIEVER.retrieve(message, 4);
  const system = buildSystem(formatSnippets(snippets));

  // 5/6. Stream the reply (mock or live) through the SSE encoder.
  if (isTruthy(env.TEST_MODE)) {
    return streamMock(message, system);
  }
  return streamLive(message, system, env);
}

/** TEST_MODE: stream the MockProvider-parity reply in ~4 chunks, then done. */
function streamMock(message: string, system: string): Response {
  const text = mockReply(message, system);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sink: SseSink = controller;
      for (const chunk of chunkText(text, 4)) {
        sendDelta(sink, chunk);
        // Small inter-chunk delay so `curl -N` against `wrangler dev` visibly
        // demonstrates incremental SSE delivery (TEST_MODE only; live tokens
        // arrive on the Anthropic stream's own cadence).
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      // No PII in mock output; stop_reason mirrors a normal completion.
      sendDone(sink, detectPii(text), "end_turn");
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * Live path: one streaming Anthropic call. Pre-stream typed errors map to 429/502
 * JSON (so the frontend's !r.ok branch renders {detail}); once tokens flow, a
 * failure can only be an `error` SSE event followed by close.
 */
async function streamLive(
  message: string,
  system: string,
  env: Env,
): Promise<Response> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const maxTokens = Number.parseInt(env.MAX_TOKENS, 10) || 1024;

  let anthropicStream: AsyncIterable<RawStreamEvent>;
  try {
    anthropicStream = (await client.messages.create({
      model: env.LODESTAR_MODEL,
      max_tokens: maxTokens,
      // cache_control kept for anthropic.py:39-45 parity (harmless no-op below
      // Haiku 4.5's minimum cacheable prefix).
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: message }],
      stream: true,
    })) as AsyncIterable<RawStreamEvent>;
  } catch (err) {
    // Pre-stream failure: the stream was never opened, so return real JSON codes.
    return preStreamError(err);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sink: SseSink = controller;
      let full = "";
      let stopReason: string | null = null;
      try {
        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "text_delta" &&
            typeof event.delta.text === "string"
          ) {
            full += event.delta.text;
            sendDelta(sink, event.delta.text);
          } else if (
            event.type === "message_delta" &&
            event.delta?.stop_reason != null
          ) {
            stopReason = event.delta.stop_reason;
          }
        }
        // Post-hoc PII advisory: streamed tokens cannot be retracted, so detect
        // on the FULL reply once and ship the kinds in `done` (frontend appends
        // a one-line note when non-empty).
        sendDone(sink, detectPii(full), stopReason);
      } catch (err) {
        console.error("mid-stream Anthropic error:", err);
        sendError(sink, MSG_UPSTREAM);
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

/** Map a pre-stream Anthropic error to a JSON response without leaking key info. */
function preStreamError(err: unknown): Response {
  console.error("pre-stream Anthropic error:", err);
  if (err instanceof RateLimitError) {
    return json({ detail: MSG_RATE_LIMIT }, 429);
  }
  // AuthenticationError (bad/missing key) and any other API/connection error map
  // to a generic 502 — the client never sees auth specifics.
  if (err instanceof AuthenticationError || err instanceof APIError) {
    return json({ detail: MSG_UPSTREAM }, 502);
  }
  return json({ detail: MSG_UPSTREAM }, 502);
}

// Minimal structural typing for the SDK's raw stream events — we only read the
// fields the relay touches, narrowed by `type`. (The SDK's full union is large;
// this keeps the relay loop honest under strict mode without importing it.)
interface RawStreamEvent {
  type: string;
  delta?: {
    type?: string;
    text?: string;
    stop_reason?: string | null;
  };
}
