"""Unit tests for agent tools (offline)."""

import pytest

from lodestar.agents.tools import retrieve_knowledge_tool, web_search_tool
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
def test_retrieve_tool_returns_formatted_context():
    tool = retrieve_knowledge_tool(_FakeRetriever())
    out = tool.func(query="resume")
    assert "Resume tips" in out
    assert tool.name == "retrieve_knowledge"
    assert "query" in tool.input_schema["properties"]


@pytest.mark.unit
def test_web_search_tool_is_stub():
    tool = web_search_tool()
    out = tool.func(query="STEM scholarships")
    assert "STEM scholarships" in out
    assert "stub" in out.lower()
