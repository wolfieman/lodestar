"""Integration tests for the rebuild — real embeddings and/or live Claude.

Auto-skip in normal (offline) runs. Set ``TEST_MODE=false`` for the fastembed semantic
test; additionally set ``ANTHROPIC_API_KEY`` for the live-model test.
"""

import os

import pytest

from ignite.app import build_agent, build_responder
from ignite.retrieval.embed import FastEmbedEmbedder
from ignite.retrieval.knowledge import VectorRetriever, load_snippets

_TRUTHY = {"1", "true", "yes", "on"}
_TEST_MODE = os.getenv("TEST_MODE", "true").strip().lower() in _TRUTHY


@pytest.mark.integration
@pytest.mark.skipif(_TEST_MODE, reason="set TEST_MODE=false to run (downloads model)")
def test_fastembed_semantic_retrieval():
    try:
        embedder = FastEmbedEmbedder()
    except Exception as exc:  # noqa: BLE001 - skip if the model can't be fetched
        pytest.skip(f"fastembed model unavailable: {type(exc).__name__}")
    retriever = VectorRetriever(embedder)
    retriever.ingest(load_snippets())
    results = retriever.retrieve("how do I build a strong resume", k=3)
    assert results and results[0].category == "resume"


@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("ANTHROPIC_API_KEY") or _TEST_MODE,
    reason="requires ANTHROPIC_API_KEY and TEST_MODE=false",
)
def test_live_claude_response_is_nonempty():
    bot = build_responder(test_mode=False)
    reply = bot.respond("Give one tip for an HBCU student's resume.")
    assert isinstance(reply, str) and reply.strip()


@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("ANTHROPIC_API_KEY") or _TEST_MODE,
    reason="requires ANTHROPIC_API_KEY and TEST_MODE=false",
)
def test_live_agent_tool_use():
    agent = build_agent(test_mode=False)
    reply = agent.run(
        "Find scholarships for HBCU STEM students and outline next steps."
    )
    assert isinstance(reply, str) and reply.strip()
