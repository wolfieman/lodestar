// POST /api/chat — the hosted AGENTIC pipeline, mirroring wsgi.py's gate order
// and the Python agent stack (agents/agent.py + providers/anthropic.py
// run_tools), with the answer streamed. Flow:
//
//   1. rate limit (env.RATE_LIMITER, keyed cf-connecting-ip; fail OPEN on throw)
//   2. tolerant JSON parse + validation (empty or >1000 code points -> 400)
//   3. PII input gate (-> 400 {detail: PII_BLOCK_DETAIL}, exact safety.py bytes)
//   4. keyword router hint (agents/router.py) appended to the system prompt
//      (agent.py:24-31 parity) — context arrives via the retrieve_knowledge
//      tool, NOT pre-injected
//   5. TEST_MODE -> streamed MockProvider.run_tools-parity reply; else the
//      Claude tool-use loop (agent.ts), final answer streamed token-by-token
//   6. retrieve_knowledge = HYBRID retrieval: Workers AI embeddings (same model
//      as the Python stack's fastembed) + Vectorize, RRF-fused with BM25; if
//      the dense side fails it degrades to BM25-only (lean-build behavior)
//   7. SSE response: delta* then done {pii, stop_reason}; mid-stream error ->
//      error event; pre-stream typed Anthropic errors -> 429/502 JSON
//
// Single user turn, stateless per request — exactly like wsgi.py's fresh agent.
// detect_pii on the user message BLOCKS (parity with the Python servers);
// detect_pii on the full displayed reply is post-hoc and advisory, shipped in
// the `done` payload's `pii` array.

import Anthropic, { APIError, AuthenticationError, RateLimitError } from "@anthropic-ai/sdk";

import {
  routingHint,
  retrieveKnowledgeTool,
  route,
  runAgentStream,
  webSearchTool,
  type AgentStreamEvent,
  type ToolSpec,
} from "./agent";
import { BM25Retriever } from "./bm25";
import { chunkText, mockAgentReply } from "./mock";
import { buildSystem, formatSnippets } from "./prompt";
import { HybridRetriever, VectorRetriever, type Retriever } from "./retrieval";
import { detectPii, PII_BLOCK_DETAIL } from "./safety";
import { SSE_HEADERS, sendDelta, sendDone, sendError, type SseSink } from "./sse";
import type { Env, Snippet } from "./types";
import knowledge from "../../data/knowledge.json";

// Module-level KB + BM25 index: built once per isolate (sparse.py parity).
const SNIPPETS = knowledge as Snippet[];
const RETRIEVER = new BM25Retriever(SNIPPETS);
const BY_ID: ReadonlyMap<string, Snippet> = new Map(SNIPPETS.map((s) => [s.id, s]));

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

/** Hybrid retriever per request (dense side needs env bindings); degrades to
 *  BM25-only inside VectorRetriever if Workers AI / Vectorize fail. */
function makeRetriever(env: Env): Retriever {
  return new HybridRetriever(new VectorRetriever(env.AI, env.VECTORIZE, BY_ID), RETRIEVER);
}

/** agent.py:26-31: build_system() (no pre-injected context) + routing hint. */
function agentSystem(message: string): string {
  return `${buildSystem()}\n\n${routingHint(route(message))}`;
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

  // 4/5. Stream the reply (mock or live agent loop) through the SSE encoder.
  if (isTruthy(env.TEST_MODE)) {
    return streamMock(message);
  }
  return streamLive(message, env);
}

/**
 * TEST_MODE: MockProvider.run_tools parity (mock.py:30-46) — the hosted Python
 * TEST_MODE drives the agent with MockProvider, which deterministically calls
 * the FIRST tool (retrieve_knowledge) with the raw message and summarizes:
 *   "[TEST_MODE agent] called tool '{name}'. Result preview: {result[:160]}"
 * The retrieval here is BM25-only (offline; no Workers AI/Vectorize calls),
 * matching the lean build's TEST_MODE exactly. Streamed in ~4 chunks through
 * the real SSE path with a small delay so `wrangler dev` shows incremental
 * delivery.
 */
function streamMock(message: string): Response {
  const result = formatSnippets(RETRIEVER.retrieve(message, 4)) || "No matching knowledge found.";
  const text = mockAgentReply("retrieve_knowledge", result);
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
 * Live path: the Claude tool-use loop with the answer streamed. Iteration 0's
 * stream is created BEFORE the Response opens so pre-stream typed errors map to
 * real 429/502 JSON (the frontend's !r.ok branch); once the SSE stream is open,
 * any failure becomes an `error` event followed by close.
 */
async function streamLive(message: string, env: Env): Promise<Response> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const maxTokens = Number.parseInt(env.MAX_TOKENS, 10) || 1024;
  const tools: ToolSpec[] = [retrieveKnowledgeTool(makeRetriever(env)), webSearchTool()];
  const system = agentSystem(message);

  // Shared params for every loop iteration (anthropic.py:60-79 parity:
  // cache_control kept; same model/max_tokens; tool specs without func).
  const createStream = (convo: unknown[]) =>
    client.messages.create({
      model: env.LODESTAR_MODEL,
      max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })) as never,
      messages: convo as never,
      stream: true,
    }) as Promise<AsyncIterable<AgentStreamEvent>>;

  let firstStream: AsyncIterable<AgentStreamEvent>;
  try {
    firstStream = await createStream([{ role: "user", content: message }]);
  } catch (err) {
    // Pre-stream failure: the stream was never opened, so return real JSON codes.
    return preStreamError(err);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sink: SseSink = controller;
      try {
        const { displayed, stopReason } = await runAgentStream({
          firstStream,
          createNext: createStream,
          message,
          tools,
          sink,
        });
        // Post-hoc PII advisory: streamed tokens cannot be retracted, so detect
        // on the FULL displayed text once and ship the kinds in `done`.
        sendDone(sink, detectPii(displayed), stopReason);
      } catch (err) {
        console.error("mid-stream agent error:", err);
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
