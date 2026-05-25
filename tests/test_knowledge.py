"""Unit tests for the knowledge base and retrieval."""

import pytest

from lodestar.knowledge import KnowledgeBase, format_snippets


@pytest.fixture(scope="module")
def kb() -> KnowledgeBase:
    return KnowledgeBase.load()


@pytest.mark.unit
def test_knowledge_loads(kb: KnowledgeBase):
    assert len(kb.snippets) > 0


@pytest.mark.unit
def test_retrieve_ranks_relevant_first(kb: KnowledgeBase):
    results = kb.retrieve("resume skills", k=3)
    assert results
    assert results[0].category == "resume"


@pytest.mark.unit
def test_retrieve_empty_query_returns_nothing(kb: KnowledgeBase):
    assert kb.retrieve("", k=3) == []


@pytest.mark.unit
def test_format_snippets_renders_markdown(kb: KnowledgeBase):
    text = format_snippets(kb.retrieve("scholarships", k=2))
    assert "###" in text
