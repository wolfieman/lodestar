// Daily usage cap for the LIVE chat path — a budget backstop layered on top of
// the per-IP rate limiter and the Anthropic spend cap. One KV counter per UTC
// day (`budget:YYYY-MM-DD`); when it reaches DAILY_BUDGET the caller refuses
// with 429 until the next UTC day, which is automatically a fresh key.
//
// Counting is deliberately APPROXIMATE: KV read-modify-write is last-write-wins
// and eventually consistent, so concurrent requests across colos can lose
// increments. Overshoot is bounded by instantaneous concurrency (small — the
// per-IP limiter throttles each IP to 12/min first), and this is a backstop,
// not billing, so approximate beats a Durable Object's exact-counting machinery.

import type { KvBudget } from "./types";

/** Keys self-clean two days after creation — yesterday's counter never lingers. */
const KEY_TTL_SECONDS = 172_800;

const DEFAULT_BUDGET = 300;

/** Counter key for the UTC day containing `now`, e.g. "budget:2026-06-09". */
export function dayKey(now: Date): string {
  return `budget:${now.toISOString().slice(0, 10)}`;
}

/** Seconds until the next UTC midnight — the Retry-After for an exhausted day. */
export function secondsUntilUtcMidnight(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.ceil((next - now.getTime()) / 1000);
}

/**
 * Parse DAILY_BUDGET. Deliberately NOT `|| DEFAULT`: an explicit "0" must
 * survive as 0, refusing all live traffic — a free manual kill switch the
 * platform otherwise lacks. Only absent/garbage/negative values get the default.
 */
export function parseBudget(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(parsed) || parsed < 0 ? DEFAULT_BUDGET : parsed;
}

/**
 * Count-then-serve: increment BEFORE the caller opens the Anthropic stream, so
 * crashed or errored requests still count — conservative for a cap. Once
 * exhausted, nothing is written (refusals are read-only), keeping the key under
 * KV's 1 write/sec/key limit during exactly the flood the cap exists for.
 * KV errors propagate; the caller picks the fail mode (chat.ts fails open).
 */
export async function checkAndConsume(
  kv: KvBudget,
  budget: number,
  now: Date,
): Promise<"ok" | "exhausted"> {
  const key = dayKey(now);
  const count = Number.parseInt((await kv.get(key)) ?? "0", 10) || 0;
  if (count >= budget) {
    return "exhausted";
  }
  await kv.put(key, String(count + 1), { expirationTtl: KEY_TTL_SECONDS });
  return "ok";
}
