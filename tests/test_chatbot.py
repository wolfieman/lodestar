"""Unit tests for the chatbot (offline, TEST_MODE — no network)."""

import pytest

from lodestar.chatbot import Chatbot, preprocess_input


@pytest.mark.unit
def test_preprocess_strips_whitespace():
    assert preprocess_input("  hello \n") == "hello"


@pytest.mark.unit
def test_respond_in_test_mode_needs_no_network():
    bot = Chatbot(test_mode=True)
    reply = bot.respond("How do I prepare for an interview?")
    assert isinstance(reply, str)
    assert "TEST_MODE" in reply
    assert len(bot.history) == 2


@pytest.mark.unit
def test_history_accumulates_across_turns():
    bot = Chatbot(test_mode=True)
    bot.respond("first")
    bot.respond("second")
    assert len(bot.history) == 4
    assert bot.history[0]["role"] == "user"
