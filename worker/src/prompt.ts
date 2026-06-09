// System-prompt assembly — port of prompts/system.py + knowledge.py formatting.
//
// SYSTEM_PROMPT and the context joiner are imported as strings from .txt files
// (wrangler Text rule) so they stay byte-identical to the Python source and are
// dual-pinned by tests/test_worker_parity.py. Never inline these strings.

// Resolved at build time by the wrangler Text rule; typed by src/txt.d.ts.
import SYSTEM_PROMPT from "./system-prompt.txt";
import CONTEXT_PREAMBLE from "./context-preamble.txt";

import type { Snippet } from "./types";

export { SYSTEM_PROMPT, CONTEXT_PREAMBLE };

/**
 * Build the system prompt, appending retrieved knowledge context when present.
 * Mirrors build_system() in prompts/system.py:
 *   no context  -> SYSTEM_PROMPT
 *   context      -> `${SYSTEM_PROMPT}\n\n${PREAMBLE}\n\n${context}`
 */
export function buildSystem(context = ""): string {
  if (!context) {
    return SYSTEM_PROMPT;
  }
  return `${SYSTEM_PROMPT}\n\n${CONTEXT_PREAMBLE}\n\n${context}`;
}

/**
 * Render snippets as markdown context for the system prompt.
 * Mirrors format_snippets() in retrieval/knowledge.py:
 *   "### {title} ({category})\n{content}" joined by "\n\n"; "" when empty.
 */
export function formatSnippets(snippets: Snippet[]): string {
  if (snippets.length === 0) {
    return "";
  }
  return snippets.map((s) => `### ${s.title} (${s.category})\n${s.content}`).join("\n\n");
}
