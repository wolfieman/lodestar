"""IgniteAI exposed as an MCP (Model Context Protocol) server.

Lets IgniteAI plug into Claude Desktop and other MCP clients as a set of career-advice
tools. Run with: ``uv run python -m ignite.mcp_server`` (stdio transport).
See ``docs/mcp.md`` for client wiring.
"""

from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from ignite.app import build_responder, build_retriever
from ignite.retrieval.knowledge import format_snippets

mcp = FastMCP("ignite-ai")

_retriever = None
_responder = None


def _retrieve(query: str) -> str:
    global _retriever
    if _retriever is None:
        _retriever = build_retriever()
    snippets = _retriever.retrieve(query, k=4)
    return format_snippets(snippets) or "No matching knowledge found."


def _advise(question: str) -> str:
    global _responder
    if _responder is None:
        _responder = build_responder()
    return _responder.respond(question)


@mcp.tool()
def retrieve_knowledge(query: str) -> str:
    """Search IgniteAI's HBCU career knowledge base (resumes, interviews,
    scholarships, internships, networking, academics) for relevant entries."""
    return _retrieve(query)


@mcp.tool()
def get_career_advice(question: str) -> str:
    """Get IgniteAI's grounded career advice for an HBCU student's question."""
    return _advise(question)


def main() -> None:
    """Run the MCP server over stdio."""
    mcp.run()


if __name__ == "__main__":
    main()
