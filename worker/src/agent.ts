// Agentic tool-use loop — port of agents/{router,tools,agent}.py and
// providers/anthropic.py run_tools(), with streaming: text deltas from every
// iteration are forwarded to the SSE sink live, so the model's final answer
// (and any brief pre-tool preamble) streams to the browser token by token.
//
// Loop shape (anthropic.py:50-102 parity): call Claude with the tool specs;
// while stop_reason == "tool_use", execute the requested tools locally, append
// the results, and call again (max_iters=5). The tools are the same two the
// Python agent registers: retrieve_knowledge (now hybrid BM25+vector RRF) and
// the web_search stub — descriptions, schemas, and output strings are
// byte-identical to agents/tools.py (pinned by tests/test_worker_parity.py).
//
// Streaming nuance: tool_use blocks must be COMPLETE before execution, so tool
// input JSON is accumulated from input_json_delta events and parsed at block
// end; only text deltas stream out early. When more than one iteration emits
// visible text, a paragraph break ("\n\n") is inserted between them.

import { pyRepr } from "./mock";
import { formatSnippets } from "./prompt";
import type { Retriever } from "./retrieval";
import { sendDelta, type SseSink } from "./sse";

// --- router.py port (dict order = first-match priority order) ---------------

const ROUTES: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
  ["resume", ["resume", "cv", "cover letter"]],
  ["interview", ["interview", "behavioral", "star method"]],
  ["scholarship", ["scholarship", "grant", "financial aid", "funding"]],
  ["internship", ["internship", "co-op", "co op"]],
  ["networking", ["network", "linkedin", "alumni", "mentor", "connect"]],
  ["academic", ["major", "course", "gpa", "class", "degree", "study"]],
];

/** router.py route(): most likely guidance category (default "general"). */
export function route(query: string): string {
  const text = query.toLowerCase();
  for (const [category, keywords] of ROUTES) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }
  return "general";
}

/** agent.py:26-31 routing-hint sentence, byte-identical. */
export function routingHint(category: string): string {
  return (
    `Routing hint: this request looks like '${category}'. Use the ` +
    "retrieve_knowledge tool to ground specifics, and web_search for " +
    "current listings."
  );
}

// --- tools.py port -----------------------------------------------------------

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  func(input: Record<string, unknown>): Promise<string>;
}

/** tools.py retrieve_knowledge_tool(): hybrid RAG over the KB. */
export function retrieveKnowledgeTool(retriever: Retriever): ToolSpec {
  return {
    name: "retrieve_knowledge",
    description:
      "Search the HBCU career knowledge base for guidance on resumes, " +
      "interviews, scholarships, internships, networking, and academics.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to look up." },
      },
      required: ["query"],
    },
    async func(input) {
      const query = typeof input.query === "string" ? input.query : "";
      const snippets = await retriever.retrieve(query, 4);
      return formatSnippets(snippets) || "No matching knowledge found.";
    },
  };
}

/** tools.py web_search_tool(): the stub, output byte-identical incl. repr(). */
export function webSearchTool(): ToolSpec {
  return {
    name: "web_search",
    description:
      "Search the web for current scholarships, internships, and job postings.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." },
      },
      required: ["query"],
    },
    async func(input) {
      const query = typeof input.query === "string" ? input.query : "";
      return (
        "[web_search stub] In production this returns current scholarship, " +
        `internship, and job listings for: ${pyRepr(query)}. Back this with a search ` +
        "API or an MCP search server."
      );
    },
  };
}

/** anthropic.py:102 parity: the max_iters exhaustion reply. */
export const MAX_ITERS_REPLY =
  "I couldn't complete that within the allotted reasoning steps.";

// --- run_tools() port with streaming -----------------------------------------

/** The slice of Anthropic stream events this loop consumes (loosely typed). */
export interface AgentStreamEvent {
  type: string;
  index?: number;
  content_block?: { type: string; id?: string; name?: string };
  delta?: {
    type?: string;
    text?: string;
    partial_json?: string;
    stop_reason?: string | null;
  };
}

interface TextBlock {
  type: "text";
  text: string;
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type ContentBlock = TextBlock | ToolUseBlock;

export interface AgentRunResult {
  /** Everything streamed to the browser (for the post-hoc PII check). */
  displayed: string;
  stopReason: string | null;
}

/**
 * Drive the tool-use loop, streaming text deltas to `sink` as they arrive.
 * `firstStream` is iteration 0's already-created stream (so the caller can map
 * pre-stream Anthropic errors to real HTTP codes); `createNext` produces each
 * subsequent iteration's stream from the running conversation.
 */
export async function runAgentStream(options: {
  firstStream: AsyncIterable<AgentStreamEvent>;
  createNext(convo: unknown[]): Promise<AsyncIterable<AgentStreamEvent>>;
  message: string;
  tools: ToolSpec[];
  sink: SseSink;
  maxIters?: number;
}): Promise<AgentRunResult> {
  const { firstStream, createNext, message, tools, sink } = options;
  const maxIters = options.maxIters ?? 5; // agent.py max_iters default
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  const convo: unknown[] = [{ role: "user", content: message }];
  let displayed = "";
  let stopReason: string | null = null;

  for (let iter = 0; iter < maxIters; iter += 1) {
    const stream =
      iter === 0 ? firstStream : await createNext(convo);

    // Re-assemble the full content blocks while forwarding text deltas live.
    const blocks: ContentBlock[] = [];
    const partialJson: string[] = [];
    let emittedThisIter = false;
    stopReason = null;

    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block) {
        if (event.content_block.type === "tool_use") {
          blocks.push({
            type: "tool_use",
            id: event.content_block.id ?? "",
            name: event.content_block.name ?? "",
            input: {},
          });
          partialJson.length = 0;
        } else if (event.content_block.type === "text") {
          blocks.push({ type: "text", text: "" });
        }
      } else if (event.type === "content_block_delta" && event.delta) {
        if (
          event.delta.type === "text_delta" &&
          typeof event.delta.text === "string"
        ) {
          const last = blocks[blocks.length - 1];
          if (last && last.type === "text") {
            last.text += event.delta.text;
          }
          // Paragraph break between iterations that both showed text.
          if (!emittedThisIter && displayed.length > 0) {
            sendDelta(sink, "\n\n");
            displayed += "\n\n";
          }
          emittedThisIter = true;
          displayed += event.delta.text;
          sendDelta(sink, event.delta.text);
        } else if (
          event.delta.type === "input_json_delta" &&
          typeof event.delta.partial_json === "string"
        ) {
          partialJson.push(event.delta.partial_json);
        }
      } else if (event.type === "content_block_stop") {
        const last = blocks[blocks.length - 1];
        if (last && last.type === "tool_use" && partialJson.length > 0) {
          try {
            last.input = JSON.parse(partialJson.join("")) as Record<
              string,
              unknown
            >;
          } catch {
            last.input = {};
          }
          partialJson.length = 0;
        }
      } else if (event.type === "message_delta" && event.delta) {
        if (event.delta.stop_reason != null) {
          stopReason = event.delta.stop_reason;
        }
      }
    }

    convo.push({ role: "assistant", content: blocks });

    if (stopReason !== "tool_use") {
      return { displayed, stopReason };
    }

    // Execute every completed tool_use block, in order (anthropic.py:85-99).
    const results: unknown[] = [];
    for (const block of blocks) {
      if (block.type === "tool_use") {
        const tool = toolMap.get(block.name);
        const output = tool
          ? await tool.func(block.input)
          : `Unknown tool: ${block.name}`;
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: output,
        });
      }
    }
    convo.push({ role: "user", content: results });
  }

  // Loop exhausted (anthropic.py:102): stream the parity reply as the answer.
  if (displayed.length > 0) {
    sendDelta(sink, "\n\n");
    displayed += "\n\n";
  }
  sendDelta(sink, MAX_ITERS_REPLY);
  displayed += MAX_ITERS_REPLY;
  return { displayed, stopReason };
}
