// Offline, deterministic streaming mock for TEST_MODE (no network, no key).
//
// Parity with src/lodestar/providers/mock.py MockProvider.complete():
//   "[TEST_MODE] Lodestar (HBCU career coach) would answer {last!r} [{grounded}]."
// where {last!r} is Python's repr() of the message and {grounded} is "grounded"
// iff the built system prompt contains "reference material" (case-insensitive),
// else "ungrounded".
//
// The reply is sliced into ~4 chunks and pushed through the SAME sse.ts encoder
// the live path uses, so TEST_MODE exercises the full SSE protocol and the
// frontend reader end to end with zero network calls.

/**
 * Python repr() of a string, restricted to the inputs this path sees.
 * MockProvider returns `f"... answer {last!r} ..."`; `last` is the user message.
 * Python prefers single quotes, switching to double quotes only when the string
 * contains a single quote but no double quote. Backslashes and the active quote
 * are escaped; \n, \r, \t use their short escapes; other non-printable / control
 * characters use \xNN / \uNNNN. We replicate that precisely so the mock text is
 * byte-identical to mock.py for the messages the gate lets through (printable,
 * <=1000 chars, no PII).
 */
export function pyRepr(s: string): string {
  const hasSingle = s.includes("'");
  const hasDouble = s.includes('"');
  const quote = hasSingle && !hasDouble ? '"' : "'";

  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (ch === "\\") {
      out += "\\\\";
    } else if (ch === quote) {
      out += "\\" + quote;
    } else if (ch === "\n") {
      out += "\\n";
    } else if (ch === "\r") {
      out += "\\r";
    } else if (ch === "\t") {
      out += "\\t";
    } else if (code < 0x20 || code === 0x7f) {
      out += "\\x" + code.toString(16).padStart(2, "0");
    } else if (code < 0x7f) {
      out += ch; // printable ASCII
    } else {
      // Python reprs printable non-ASCII as themselves (str.isprintable()); the
      // gate forbids control chars in practice, so emit the character verbatim.
      out += ch;
    }
  }
  return quote + out + quote;
}

/** Build the MockProvider-parity reply text for a message + assembled system. */
export function mockReply(message: string, system: string): string {
  const grounded = system.toLowerCase().includes("reference material")
    ? "grounded"
    : "ungrounded";
  return (
    "[TEST_MODE] Lodestar (HBCU career coach) would answer " +
    `${pyRepr(message)} [${grounded}].`
  );
}

/**
 * MockProvider.run_tools parity (mock.py:30-46): the hosted TEST_MODE drives
 * the agent with MockProvider, which deterministically calls the FIRST tool
 * and summarizes: "[TEST_MODE agent] called tool '{name}'. Result preview:
 * {result[:160]}". Python slices by CODE POINTS, so we spread before slicing.
 */
export function mockAgentReply(toolName: string, result: string): string {
  const preview = [...result].slice(0, 160).join("");
  return `[TEST_MODE agent] called tool '${toolName}'. Result preview: ${preview}`;
}

/** Split a string into ~`parts` contiguous chunks (last absorbs the remainder). */
export function chunkText(text: string, parts = 4): string[] {
  if (text.length === 0) {
    return [""];
  }
  const n = Math.min(parts, text.length);
  const size = Math.ceil(text.length / n);
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
