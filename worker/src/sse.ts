// Server-Sent Events encoding for the streaming chat response.
//
// Wire format is dictated by the EXISTING frontend reader in
// src/lodestar/static/index.html (readStream/dispatch): each event is an
// `event: <name>` line plus one `data: <json>` line, terminated by a blank
// line ("\n\n"). The reader buffer-splits on "\n\n" and parses the
// `event:`/`data:` lines, so this encoder must emit exactly that shape.
//
// Event names the frontend understands: "delta" {text}, "done" {pii, stop_reason},
// "error" {detail}. (No "notice" event — the hosted PII gate BLOCKS with a 400
// before the stream opens, mirroring wsgi.py/web.py and the reader, which has no
// notice handler.)

/** Encode a single SSE event as a UTF-8 byte chunk: `event:`+`data:`+blank line. */
export function encodeEvent(event: string, data: unknown): Uint8Array {
  // JSON on one line; the frontend trims each data line and rejoins with "\n",
  // so a single-line payload is parsed verbatim by JSON.parse.
  const payload = JSON.stringify(data);
  return new TextEncoder().encode(`event: ${event}\ndata: ${payload}\n\n`);
}

/** Controller surface used by the pump (a ReadableStream default controller). */
export interface SseSink {
  enqueue(chunk: Uint8Array): void;
}

/** Enqueue one encoded SSE event onto the stream. */
export function sendEvent(sink: SseSink, event: string, data: unknown): void {
  sink.enqueue(encodeEvent(event, data));
}

/** Enqueue a `delta` event carrying one text chunk. */
export function sendDelta(sink: SseSink, text: string): void {
  sendEvent(sink, "delta", { text });
}

/**
 * Enqueue the terminal `done` event. `pii` is the kinds detected post-hoc in the
 * FULL reply ([] if none); `stop_reason` mirrors the Anthropic stop_reason so the
 * frontend can show the truncation note when it is "max_tokens".
 */
export function sendDone(sink: SseSink, pii: string[], stopReason: string | null): void {
  sendEvent(sink, "done", { pii, stop_reason: stopReason });
}

/** Enqueue an `error` event ({detail}); the caller closes the stream after. */
export function sendError(sink: SseSink, detail: string): void {
  sendEvent(sink, "error", { detail });
}

/** Standard headers for the SSE response (no buffering, no transform). */
export const SSE_HEADERS: Record<string, string> = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
};
