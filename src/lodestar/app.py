"""Assemble a ready-to-use Responder from the environment.

TEST_MODE (default) wires the offline mock provider + a deterministic hash embedder,
so the app runs with no network or API key. Otherwise it uses the configured provider
(Claude by default) and local fastembed embeddings.
"""

from __future__ import annotations

from lodestar.agents.agent import IgniteAgent
from lodestar.agents.tools import retrieve_knowledge_tool, web_search_tool
from lodestar.providers.config import env_test_mode, get_provider
from lodestar.responder import Responder
from lodestar.retrieval.base import Retriever
from lodestar.retrieval.embed import FastEmbedEmbedder, HashEmbedder
from lodestar.retrieval.hybrid import HybridRetriever
from lodestar.retrieval.knowledge import VectorRetriever, load_snippets
from lodestar.retrieval.sparse import BM25Retriever


def _build_retriever(test_mode: bool) -> Retriever:
    """Hybrid retriever (dense vector + sparse BM25, fused with RRF).

    Degrades gracefully to BM25-only if the embedding model can't be loaded (e.g. no
    network to download it), so the app always runs.
    """
    snippets = load_snippets()
    sparse = BM25Retriever(snippets)
    if test_mode:
        dense = VectorRetriever(HashEmbedder())
        dense.ingest(snippets)
        return HybridRetriever(dense, sparse)
    try:
        dense = VectorRetriever(FastEmbedEmbedder())
        dense.ingest(snippets)
        return HybridRetriever(dense, sparse)
    except Exception as exc:  # model-load/network failure → degrade, don't crash
        print(
            f"[lodestar] embedding model unavailable ({type(exc).__name__}); "
            "using BM25-only retrieval."
        )
        return sparse


def build_responder(test_mode: bool | None = None) -> Responder:
    """Build a fully wired Responder (provider + ingested vector retriever)."""
    tm = env_test_mode() if test_mode is None else test_mode
    return Responder(get_provider(tm), _build_retriever(tm))


def build_agent(test_mode: bool | None = None) -> IgniteAgent:
    """Build the agentic IgniteAgent (provider + retrieve_knowledge + web_search)."""
    tm = env_test_mode() if test_mode is None else test_mode
    retriever = _build_retriever(tm)
    tools = [retrieve_knowledge_tool(retriever), web_search_tool()]
    return IgniteAgent(get_provider(tm), tools)


def build_retriever(test_mode: bool | None = None) -> Retriever:
    """Public factory for the hybrid retriever (used by the MCP server)."""
    return _build_retriever(env_test_mode() if test_mode is None else test_mode)
