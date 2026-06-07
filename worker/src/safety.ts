// Lightweight PII detection — port of src/lodestar/safety.py.
//
// Supports the FERPA/GDPR no-PII posture: a pragmatic guard that lets the app
// avoid soliciting or echoing obvious personal identifiers. Not a full DLP.
//
// Unicode divergence (accepted — the input gate is advisory/best-effort):
// Python's `re` makes \w, \d, and \b Unicode-aware by default, so it flags
// some non-ASCII identifiers. JavaScript RegExp (no `u` flag) treats \w as
// [A-Za-z0-9_], \d as [0-9], and \b as ASCII word boundaries. This port
// therefore UNDER-FLAGS non-ASCII PII relative to Python. Fixtures are kept
// ASCII-only so the two implementations agree on the tested inputs.

const PATTERNS: Record<string, RegExp> = {
  // \b\d{3}-\d{2}-\d{4}\b
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  // \b[\w.+-]+@[\w-]+\.[\w.-]+\b
  email: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/,
  // \b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b
  phone: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
};

/**
 * Exact user-facing message for the hosted-chat PII input gate.
 * Parity-tested against lodestar.safety.PII_BLOCK_DETAIL — the em dash (U+2014)
 * is significant; do not rephrase or replace it with a hyphen.
 */
export const PII_BLOCK_DETAIL =
  "That looks like it includes personal info (an email, phone number, or SSN). " +
  "Lodestar never needs it — take it out and send again.";

/** Return the kinds of PII detected in `text` (empty array if none). */
export function detectPii(text: string): string[] {
  const kinds: string[] = [];
  for (const [kind, pattern] of Object.entries(PATTERNS)) {
    if (pattern.test(text)) {
      kinds.push(kind);
    }
  }
  return kinds;
}

/** Whether `text` appears to contain personal identifying information. */
export function containsPii(text: string): boolean {
  return detectPii(text).length > 0;
}
