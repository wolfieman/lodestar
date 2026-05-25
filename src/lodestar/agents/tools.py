"""Agent tools. ``Tool`` is a model-agnostic spec: name + JSON schema + function."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from lodestar.retrieval.base import Retriever
from lodestar.retrieval.knowledge import format_snippets


@dataclass
class Tool:
    """A callable tool the agent can invoke, with a JSON-schema input contract."""

    name: str
    description: str
    input_schema: dict
    func: Callable[..., str]


def retrieve_knowledge_tool(retriever: Retriever) -> Tool:
    """A tool that searches the local HBCU career knowledge base (RAG)."""

    def run(query: str) -> str:
        snippets = retriever.retrieve(query, k=4)
        return format_snippets(snippets) or "No matching knowledge found."

    return Tool(
        name="retrieve_knowledge",
        description=(
            "Search the HBCU career knowledge base for guidance on resumes, "
            "interviews, scholarships, internships, networking, and academics."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What to look up."}
            },
            "required": ["query"],
        },
        func=run,
    )


def web_search_tool() -> Tool:
    """A stub web-search tool (wire a real search API or MCP server in production)."""

    def run(query: str) -> str:
        return (
            "[web_search stub] In production this returns current scholarship, "
            f"internship, and job listings for: {query!r}. Back this with a search "
            "API or an MCP search server."
        )

    return Tool(
        name="web_search",
        description=(
            "Search the web for current scholarships, internships, and job postings."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query."}
            },
            "required": ["query"],
        },
        func=run,
    )
