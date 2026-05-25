"""Hybrid retrieval: fuse dense (vector) and sparse (BM25) results with RRF.

Reciprocal Rank Fusion combines two ranked lists without needing comparable scores:
each item gets ``sum(1 / (rrf_k + rank))`` across the retrievers, then we re-rank.
"""

from __future__ import annotations

from ignite.retrieval.base import Retriever, Snippet


class HybridRetriever:
    """Combine a dense and a sparse retriever via Reciprocal Rank Fusion."""

    def __init__(
        self,
        dense: Retriever,
        sparse: Retriever,
        *,
        rrf_k: int = 60,
        pool: int = 10,
    ) -> None:
        self.dense = dense
        self.sparse = sparse
        self.rrf_k = rrf_k
        self.pool = pool

    def retrieve(self, query: str, k: int = 4) -> list[Snippet]:
        scores: dict[str, float] = {}
        found: dict[str, Snippet] = {}
        ranked_lists = (
            self.dense.retrieve(query, self.pool),
            self.sparse.retrieve(query, self.pool),
        )
        for hits in ranked_lists:
            for rank, snippet in enumerate(hits, start=1):
                scores[snippet.id] = scores.get(snippet.id, 0.0) + 1.0 / (
                    self.rrf_k + rank
                )
                found[snippet.id] = snippet
        order = sorted(scores, key=lambda sid: scores[sid], reverse=True)
        return [found[sid] for sid in order[:k]]
