// Hybrid retrieval — port of retrieval/hybrid.py (Reciprocal Rank Fusion), with
// the dense side backed by Workers AI embeddings + Vectorize instead of
// fastembed + LanceDB (which cannot run inside Workers). The embedding model is
// the SAME one the Python stack uses (bge-small-en-v1.5, 384 dims), hosted by
// Cloudflare; the Vectorize index is seeded from data/knowledge.json by
// worker/scripts/seed-vectorize.mjs.
//
// RRF parity (hybrid.py:29-42): each snippet earns sum(1/(rrf_k + rank)) across
// the dense and sparse ranked lists (rank starts at 1, dense list first), then
// snippets re-rank by fused score descending with first-seen insertion order as
// the tiebreak (Python dict + sorted() stability == JS Map + stable sort).
// Defaults: rrf_k=60, pool=10, k=4. Fixture-tested against the real Python
// HybridRetriever in worker/test/fixtures/rrf_parity.json.
//
// Resilience (retrieval degradation, mirroring the Python stack's philosophy):
// if the embedding call or the Vectorize query throws, VectorRetriever returns
// [] and logs — RRF over one list preserves the BM25 order, so the chat keeps
// working BM25-only exactly like the lean build.

import type { AiBinding, Snippet, VectorizeBinding } from "./types";

export const EMBED_MODEL = "@cf/baai/bge-small-en-v1.5";

/** Common retriever surface (BM25Retriever satisfies the sync variant). */
export interface Retriever {
  retrieve(query: string, k: number): Promise<Snippet[]> | Snippet[];
}

/** Dense retriever: embed the query via Workers AI, search Vectorize by id. */
export class VectorRetriever implements Retriever {
  constructor(
    private readonly ai: AiBinding,
    private readonly index: VectorizeBinding,
    private readonly byId: ReadonlyMap<string, Snippet>,
  ) {}

  async retrieve(query: string, k: number): Promise<Snippet[]> {
    try {
      const embedding = await this.ai.run(EMBED_MODEL, { text: [query] });
      const vector = embedding.data[0];
      if (!Array.isArray(vector) || vector.length === 0) {
        console.error("vector retrieve: empty embedding; degrading to sparse");
        return [];
      }
      const result = await this.index.query(vector, { topK: k });
      const snippets: Snippet[] = [];
      for (const match of result.matches) {
        const snippet = this.byId.get(match.id);
        if (snippet) {
          snippets.push(snippet);
        }
      }
      return snippets;
    } catch (err) {
      // Graceful degradation (NOT an outage): BM25-only, like the lean build.
      console.error("vector retrieve failed; degrading to sparse:", err);
      return [];
    }
  }
}

/** Reciprocal Rank Fusion over a dense and a sparse retriever (hybrid.py port). */
export class HybridRetriever implements Retriever {
  private readonly rrfK: number;
  private readonly pool: number;

  constructor(
    private readonly dense: Retriever,
    private readonly sparse: Retriever,
    options: { rrfK?: number; pool?: number } = {},
  ) {
    this.rrfK = options.rrfK ?? 60;
    this.pool = options.pool ?? 10;
  }

  async retrieve(query: string, k = 4): Promise<Snippet[]> {
    // Dense first, then sparse — list order defines first-seen tie order,
    // matching hybrid.py's ranked_lists tuple order.
    const rankedLists = [
      await this.dense.retrieve(query, this.pool),
      await this.sparse.retrieve(query, this.pool),
    ];
    const scores = new Map<string, number>();
    const found = new Map<string, Snippet>();
    for (const hits of rankedLists) {
      hits.forEach((snippet, i) => {
        const rank = i + 1; // enumerate(hits, start=1)
        scores.set(snippet.id, (scores.get(snippet.id) ?? 0) + 1.0 / (this.rrfK + rank));
        found.set(snippet.id, snippet);
      });
    }
    // sorted(scores, key=score, reverse=True) — stable over insertion order.
    const order = [...scores.keys()].sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0));
    return order.slice(0, k).map((id) => found.get(id)!);
  }
}
