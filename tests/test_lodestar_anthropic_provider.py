"""Contract test: AnthropicProvider.run_tools() sends strict tool specs (offline).

Copyright © 2026 Wolfgang Sanyer
Licensed under the Polyform Noncommercial License 1.0.0 (see LICENSE).
"""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from lodestar.agents.tools import retrieve_knowledge_tool, web_search_tool
from lodestar.providers.anthropic import AnthropicProvider
from lodestar.retrieval.base import Snippet


@dataclass
class _Block:
    type: str
    text: str = ""


@dataclass
class _Response:
    content: list[_Block]
    stop_reason: str


class _FakeMessages:
    """Records every ``create`` call and returns one canned final-answer response."""

    def __init__(self) -> None:
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return _Response(content=[_Block(type="text", text="done")], stop_reason="end_turn")


class _FakeAnthropicClient:
    def __init__(self) -> None:
        self.messages = _FakeMessages()


class _FakeRetriever:
    def retrieve(self, query: str, k: int = 4) -> list[Snippet]:
        return []


@pytest.mark.contract
def test_run_tools_sends_strict_tool_specs():
    """Every tool spec sent to the Messages API carries strict:true."""
    provider = AnthropicProvider()
    fake_client = _FakeAnthropicClient()
    provider._client = fake_client  # bypass lazy SDK import; no network/key needed

    tools = [retrieve_knowledge_tool(_FakeRetriever()), web_search_tool()]
    provider.run_tools("system prompt", [{"role": "user", "content": "hi"}], tools)

    assert len(fake_client.messages.calls) == 1
    sent_specs = fake_client.messages.calls[0]["tools"]
    assert len(sent_specs) == 2
    for spec in sent_specs:
        assert spec["strict"] is True
        assert spec["input_schema"]["additionalProperties"] is False
        assert "required" in spec["input_schema"]
