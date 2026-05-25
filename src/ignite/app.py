"""Assemble a ready-to-use Responder from the environment.

TEST_MODE (default) wires the offline mock provider + a deterministic hash embedder,
so the app runs with no network or API key. Otherwise it uses the configured provider
(Claude by default) and local fastembed embeddings.
"""

from __future__ import annotations

from ignite.providers.config import env_test_mode, get_provider
from ignite.responder import Responder
from ignite.retrieval.embed import FastEmbedEmbedder, HashEmbedder
from ignite.retrieval.knowledge import VectorRetriever, load_snippets


def build_responder(test_mode: bool | None = None) -> Responder:
    """Build a fully wired Responder (provider + ingested vector retriever)."""
    tm = env_test_mode() if test_mode is None else test_mode
    provider = get_provider(tm)
    embedder = HashEmbedder() if tm else FastEmbedEmbedder()
    retriever = VectorRetriever(embedder)
    retriever.ingest(load_snippets())
    return Responder(provider, retriever)
