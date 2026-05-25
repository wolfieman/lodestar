"""Unit tests for the RAG responder (offline, mock provider + fake retriever)."""

import pytest

from lodestar.providers.mock import MockProvider
from lodestar.responder import Responder
from lodestar.retrieval.base import Snippet


class _FakeRetriever:
    def retrieve(self, query: str, k: int = 4) -> list[Snippet]:
        return [
            Snippet(
                id="r1",
                category="resume",
                title="Resume tips",
                content="Lead with projects.",
            )
        ]


@pytest.mark.unit
def test_responder_grounds_and_tracks_history():
    bot = Responder(MockProvider(), _FakeRetriever())
    reply = bot.respond("How do I improve my resume?")
    assert isinstance(reply, str) and reply
    # retrieved context was injected into the system prompt
    assert "[grounded]" in reply
    assert len(bot.history) == 2
    assert bot.history[0]["role"] == "user"
