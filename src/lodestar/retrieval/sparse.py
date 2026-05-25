"""Sparse (keyword) retrieval via BM25 — no model or network required."""

from __future__ import annotations

import re

from rank_bm25 import BM25Okapi

from lodestar.retrieval.base import Snippet

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


class BM25Retriever:
    """Classic BM25 keyword ranking over the knowledge snippets."""

    def __init__(self, snippets: list[Snippet]) -> None:
        self.snippets = snippets
        corpus = [
            _tokenize(f"{s.title} {s.content} {s.category}") for s in snippets
        ]
        self._bm25 = BM25Okapi(corpus)

    def retrieve(self, query: str, k: int = 4) -> list[Snippet]:
        """Return the top-``k`` snippets by BM25 score (positive scores only)."""
        scores = self._bm25.get_scores(_tokenize(query))
        ranked = sorted(
            range(len(self.snippets)), key=lambda i: scores[i], reverse=True
        )
        return [self.snippets[i] for i in ranked[:k] if scores[i] > 0]
