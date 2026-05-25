"""Unit tests for sparse (BM25) and hybrid retrieval (offline, no model)."""

import pytest

from lodestar.retrieval.embed import HashEmbedder
from lodestar.retrieval.hybrid import HybridRetriever
from lodestar.retrieval.knowledge import VectorRetriever, load_snippets
from lodestar.retrieval.sparse import BM25Retriever


@pytest.fixture(scope="module")
def snippets():
    return load_snippets()


@pytest.mark.unit
def test_bm25_surfaces_relevant_category(snippets):
    sparse = BM25Retriever(snippets)
    results = sparse.retrieve("resume tips", k=3)
    assert results
    assert "resume" in {r.category for r in results}


@pytest.mark.unit
def test_hybrid_fuses_dense_and_sparse(snippets):
    dense = VectorRetriever(HashEmbedder())
    dense.ingest(snippets)
    hybrid = HybridRetriever(dense, BM25Retriever(snippets))
    results = hybrid.retrieve("scholarships for STEM students", k=3)
    assert 1 <= len(results) <= 3
    assert "scholarship" in {r.category for r in results}
