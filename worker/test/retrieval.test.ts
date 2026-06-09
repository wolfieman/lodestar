// Hybrid-retrieval tests: RRF fusion parity against the REAL Python
// HybridRetriever (fixture cases from scripts/gen_agent_fixtures.py) plus the
// VectorRetriever's graceful BM25-only degradation contract.

import { describe, expect, it } from "vitest";

import { HybridRetriever, VectorRetriever } from "../src/retrieval";
import type { AiBinding, Snippet, VectorizeBinding } from "../src/types";
import fixture from "./fixtures/agent_parity.json";

/** Same synthetic snippet shape the fixture generator uses. */
function snip(id: string): Snippet {
  return { id, category: "c", title: `t-${id}`, content: "x" };
}

/** Fixed ranked list capped at k (mirrors the generator's _StubRetriever). */
function stubRetriever(ids: string[]) {
  const snips = ids.map(snip);
  return { retrieve: (_q: string, k: number) => snips.slice(0, k) };
}

describe("RRF fusion parity (hybrid.py fixture)", () => {
  fixture.rrf.forEach((rrfCase, i) => {
    it(`case ${i}: dense=${JSON.stringify(rrfCase.dense.slice(0, 4))}... sparse=${JSON.stringify(
      rrfCase.sparse.slice(0, 4),
    )}...`, async () => {
      const hybrid = new HybridRetriever(
        stubRetriever(rrfCase.dense),
        stubRetriever(rrfCase.sparse),
        { pool: rrfCase.pool ?? 10 },
      );
      const got = await hybrid.retrieve("q", rrfCase.k);
      expect(got.map((s) => s.id)).toEqual(rrfCase.expected);
    });
  });
});

// --- VectorRetriever ----------------------------------------------------------

const BY_ID: ReadonlyMap<string, Snippet> = new Map(["s1", "s2", "s3"].map((id) => [id, snip(id)]));

function okAi(): AiBinding {
  return { run: () => Promise.resolve({ data: [[0.1, 0.2, 0.3]] }) };
}

describe("VectorRetriever", () => {
  it("maps Vectorize matches to snippets in score order, skipping unknown ids", async () => {
    const vectorize: VectorizeBinding = {
      query: () =>
        Promise.resolve({
          matches: [
            { id: "s2", score: 0.9 },
            { id: "ghost", score: 0.8 },
            { id: "s1", score: 0.7 },
          ],
        }),
    };
    const dense = new VectorRetriever(okAi(), vectorize, BY_ID);
    const got = await dense.retrieve("q", 3);
    expect(got.map((s) => s.id)).toEqual(["s2", "s1"]);
  });

  it("degrades to [] when the embedding call throws", async () => {
    const ai: AiBinding = { run: () => Promise.reject(new Error("ai down")) };
    const vectorize: VectorizeBinding = {
      query: () => {
        throw new Error("must not be reached");
      },
    };
    const dense = new VectorRetriever(ai, vectorize, BY_ID);
    expect(await dense.retrieve("q", 3)).toEqual([]);
  });

  it("degrades to [] when the Vectorize query throws", async () => {
    const vectorize: VectorizeBinding = {
      query: () => Promise.reject(new Error("index down")),
    };
    const dense = new VectorRetriever(okAi(), vectorize, BY_ID);
    expect(await dense.retrieve("q", 3)).toEqual([]);
  });

  it("degrades to [] on an empty embedding payload", async () => {
    const ai: AiBinding = { run: () => Promise.resolve({ data: [] }) };
    const vectorize: VectorizeBinding = {
      query: () => {
        throw new Error("must not be reached");
      },
    };
    const dense = new VectorRetriever(ai, vectorize, BY_ID);
    expect(await dense.retrieve("q", 3)).toEqual([]);
  });

  it("hybrid over a degraded dense side preserves the sparse order (lean-build invariant)", async () => {
    const failingDense = {
      retrieve: () => Promise.resolve([] as Snippet[]),
    };
    const sparse = stubRetriever(["a", "b", "c", "d", "e"]);
    const hybrid = new HybridRetriever(failingDense, sparse);
    const got = await hybrid.retrieve("q", 4);
    expect(got.map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
  });
});
