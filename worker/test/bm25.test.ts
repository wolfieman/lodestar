// BM25 parity tests: the TypeScript port must reproduce the Python rank-bm25
// 0.2.2 fixture exactly (ids exact, scores within 1e-9), and honor the
// positive-only filter, the k cap, and the empty-query case.

import { describe, expect, it } from "vitest";

import { BM25Retriever } from "../src/bm25";
import type { Snippet } from "../src/types";
import knowledge from "../../data/knowledge.json";
import fixtures from "./fixtures/bm25_parity.json";

const snippets = knowledge as Snippet[];
const retriever = new BM25Retriever(snippets);

interface FixtureCase {
  query: string;
  rankedIds: string[];
  scores: number[];
}

describe("BM25Retriever fixture parity", () => {
  it("loads the full 23-snippet KB", () => {
    expect(snippets.length).toBe(fixtures.snippetCount);
    expect(snippets.length).toBe(23);
  });

  for (const fc of fixtures.cases as FixtureCase[]) {
    it(`matches Python ranking for: ${fc.query}`, () => {
      const { ids, scores } = retriever.rankAll(fc.query);

      // IDs (the full ranking) must match exactly, ties included.
      expect(ids).toEqual(fc.rankedIds);

      // Scores must match within 1e-9 (relative or absolute near zero).
      expect(scores.length).toBe(fc.scores.length);
      for (let i = 0; i < scores.length; i++) {
        const expected = fc.scores[i];
        const tol = 1e-9 * Math.max(1, Math.abs(expected));
        expect(Math.abs(scores[i] - expected)).toBeLessThanOrEqual(tol);
      }
    });
  }
});

describe("BM25Retriever.retrieve filters", () => {
  it("returns only positive-scoring snippets, capped at k", () => {
    // Use a fixture case with many positive hits.
    const fc = (fixtures.cases as FixtureCase[]).find(
      (c) => c.query === "How should I prepare for a behavioral interview?",
    )!;
    const positiveCount = fc.scores.filter((s) => s > 0).length;
    expect(positiveCount).toBeGreaterThan(4);

    const top = retriever.retrieve(fc.query, 4);
    expect(top.length).toBe(4); // k cap
    expect(top.map((s) => s.id)).toEqual(fc.rankedIds.slice(0, 4));
  });

  it("returns [] for a query with no vocabulary hits", () => {
    const fc = (fixtures.cases as FixtureCase[]).find(
      (c) => c.query === "zzqqxx flibbertigibbet",
    )!;
    expect(fc.scores.every((s) => s <= 0)).toBe(true); // fixture is all-zero
    expect(retriever.retrieve(fc.query, 4)).toEqual([]);
  });

  it("returns [] for an empty-after-tokenize query", () => {
    expect(retriever.retrieve("!!! ??? ...", 4)).toEqual([]);
    expect(retriever.retrieve("", 4)).toEqual([]);
  });

  it("caps results when fewer than k positives exist", () => {
    // "scholarship" has exactly 4 positive hits in the fixture.
    const fc = (fixtures.cases as FixtureCase[]).find(
      (c) => c.query === "scholarship",
    )!;
    const positiveCount = fc.scores.filter((s) => s > 0).length;
    const top = retriever.retrieve("scholarship", 10);
    expect(top.length).toBe(positiveCount);
  });
});
