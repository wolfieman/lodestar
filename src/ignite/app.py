"""Assemble a ready-to-use Responder from the environment.

TEST_MODE (default) wires the offline mock provider + a deterministic hash embedder,
so the app runs with no network or API key. Otherwise it uses the configured provider
(Claude by default) and local fastembed embeddings.
"""

from __future__ import annotations

from ignite.agents.agent import IgniteAgent
from ignite.agents.tools import retrieve_knowledge_tool, web_search_tool
from ignite.providers.config import env_test_mode, get_provider
from ignite.responder import Responder
from ignite.retrieval.embed import FastEmbedEmbedder, HashEmbedder
from ignite.retrieval.knowledge import VectorRetriever, load_snippets


def _build_retriever(test_mode: bool) -> VectorRetriever:
    embedder = HashEmbedder() if test_mode else FastEmbedEmbedder()
    retriever = VectorRetriever(embedder)
    retriever.ingest(load_snippets())
    return retriever


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
