// Unit suite for the daily budget counter (budget.ts) against an in-memory
// Map-backed KV fake. `now` is injectable, so the UTC day rollover is tested
// directly instead of by mocking clocks.

import { describe, expect, it } from "vitest";

import { checkAndConsume, dayKey, parseBudget, secondsUntilUtcMidnight } from "../src/budget";
import type { KvBudget } from "../src/types";

interface RecordedPut {
  key: string;
  value: string;
  expirationTtl: number;
}

interface FakeKv extends KvBudget {
  store: Map<string, string>;
  puts: RecordedPut[];
}

function fakeKv(): FakeKv {
  const store = new Map<string, string>();
  const puts: RecordedPut[] = [];
  return {
    store,
    puts,
    get(key) {
      return Promise.resolve(store.get(key) ?? null);
    },
    put(key, value, options) {
      store.set(key, value);
      puts.push({ key, value, expirationTtl: options.expirationTtl });
      return Promise.resolve();
    },
  };
}

const DAY1 = new Date("2026-06-09T15:30:00Z");
const DAY2 = new Date("2026-06-10T00:00:01Z");

describe("dayKey", () => {
  it("is the UTC date, prefixed", () => {
    expect(dayKey(DAY1)).toBe("budget:2026-06-09");
    // 23:30 in UTC-5 land is still the same UTC day — only UTC matters.
    expect(dayKey(new Date("2026-06-09T23:59:59Z"))).toBe("budget:2026-06-09");
    expect(dayKey(DAY2)).toBe("budget:2026-06-10");
  });
});

describe("secondsUntilUtcMidnight", () => {
  it("counts down to the next UTC midnight", () => {
    expect(secondsUntilUtcMidnight(new Date("2026-06-09T23:59:30Z"))).toBe(30);
    expect(secondsUntilUtcMidnight(new Date("2026-06-09T00:00:00Z"))).toBe(86400);
    expect(secondsUntilUtcMidnight(DAY1)).toBe(8.5 * 3600);
  });
});

describe("parseBudget", () => {
  it("parses the stringified int", () => {
    expect(parseBudget("300")).toBe(300);
    expect(parseBudget("12")).toBe(12);
  });

  it("falls back to 300 for absent or garbage values", () => {
    expect(parseBudget(undefined)).toBe(300);
    expect(parseBudget("")).toBe(300);
    expect(parseBudget("lots")).toBe(300);
    expect(parseBudget("-5")).toBe(300);
  });

  it('keeps an explicit "0" — the kill switch must not collapse to the default', () => {
    expect(parseBudget("0")).toBe(0);
  });
});

describe("checkAndConsume", () => {
  it("admits under the limit and increments the day's counter", async () => {
    const kv = fakeKv();
    for (let i = 1; i <= 3; i += 1) {
      expect(await checkAndConsume(kv, 5, DAY1)).toBe("ok");
      expect(kv.store.get(dayKey(DAY1))).toBe(String(i));
    }
  });

  it("refuses at the boundary (count == budget) and never overshoots", async () => {
    const kv = fakeKv();
    expect(await checkAndConsume(kv, 2, DAY1)).toBe("ok");
    expect(await checkAndConsume(kv, 2, DAY1)).toBe("ok");
    expect(await checkAndConsume(kv, 2, DAY1)).toBe("exhausted");
    expect(kv.store.get(dayKey(DAY1))).toBe("2");
  });

  it("writes nothing once exhausted (refusals are read-only)", async () => {
    const kv = fakeKv();
    await checkAndConsume(kv, 2, DAY1);
    await checkAndConsume(kv, 2, DAY1);
    for (let i = 0; i < 3; i += 1) {
      expect(await checkAndConsume(kv, 2, DAY1)).toBe("exhausted");
    }
    expect(kv.puts).toHaveLength(2);
  });

  it("rolls over at the UTC day boundary onto a fresh key", async () => {
    const kv = fakeKv();
    await checkAndConsume(kv, 2, DAY1);
    await checkAndConsume(kv, 2, DAY1);
    expect(await checkAndConsume(kv, 2, DAY1)).toBe("exhausted");
    expect(await checkAndConsume(kv, 2, DAY2)).toBe("ok");
    expect(kv.store.get(dayKey(DAY2))).toBe("1");
    expect(kv.store.get(dayKey(DAY1))).toBe("2"); // yesterday untouched
  });

  it("passes the 2-day self-clean TTL on every put", async () => {
    const kv = fakeKv();
    await checkAndConsume(kv, 5, DAY1);
    await checkAndConsume(kv, 5, DAY1);
    await checkAndConsume(kv, 5, DAY2);
    expect(kv.puts).toHaveLength(3);
    for (const put of kv.puts) {
      expect(put.expirationTtl).toBe(172800);
    }
  });

  it("budget 0 refuses everything and never writes (kill switch)", async () => {
    const kv = fakeKv();
    expect(await checkAndConsume(kv, 0, DAY1)).toBe("exhausted");
    expect(await checkAndConsume(kv, 0, DAY2)).toBe("exhausted");
    expect(kv.puts).toHaveLength(0);
  });

  it("treats a corrupt stored value as zero and recovers", async () => {
    const kv = fakeKv();
    kv.store.set(dayKey(DAY1), "not-a-number");
    expect(await checkAndConsume(kv, 2, DAY1)).toBe("ok");
    expect(kv.store.get(dayKey(DAY1))).toBe("1");
  });
});
