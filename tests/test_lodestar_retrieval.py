"""Unit tests for the retrieval mechanics (offline, hash embedder + LanceDB)."""

import pytest

from lodestar.retrieval.base import Snippet
from lodestar.retrieval.embed import HashEmbedder
from lodestar.retrieval.knowledge import VectorRetriever, format_snippets, load_snippets
from lodestar.retrieval.vector_store import VectorStore


@pytest.fixture(scope="module")
def retriever() -> VectorRetriever:
    r = VectorRetriever(HashEmbedder(), VectorStore())
    r.ingest(load_snippets())
    return r


@pytest.mark.unit
def test_load_snippets():
    snippets = load_snippets()
    assert len(snippets) > 0
    assert isinstance(snippets[0], Snippet)


@pytest.mark.unit
def test_retrieve_returns_up_to_k_snippets(retriever: VectorRetriever):
    results = retriever.retrieve("resume help", k=3)
    assert 1 <= len(results) <= 3
    assert all(isinstance(x, Snippet) for x in results)


@pytest.mark.unit
def test_format_snippets_renders_markdown(retriever: VectorRetriever):
    text = format_snippets(retriever.retrieve("scholarships", k=2))
    assert "###" in text
