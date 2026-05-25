"""Integration test — calls the live OpenAI API.

Auto-skips unless ``OPENAI_API_KEY`` is set and ``TEST_MODE`` is disabled.
"""

import os

import pytest

from ignite.chatbot import Chatbot

_TRUTHY = {"1", "true", "yes", "on"}
_SKIP = (
    not os.getenv("OPENAI_API_KEY")
    or os.getenv("TEST_MODE", "true").strip().lower() in _TRUTHY
)


@pytest.mark.integration
@pytest.mark.skipif(_SKIP, reason="requires OPENAI_API_KEY and TEST_MODE=false")
def test_live_response_is_nonempty():
    bot = Chatbot(test_mode=False)
    reply = bot.respond("Give one resume tip for an HBCU student.")
    assert isinstance(reply, str) and reply.strip()
