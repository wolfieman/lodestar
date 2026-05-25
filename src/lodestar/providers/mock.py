"""Offline, deterministic provider for TEST_MODE and unit tests (no network/key)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from lodestar.providers.base import LLMProvider, Message

if TYPE_CHECKING:
    from lodestar.agents.tools import Tool


class MockProvider(LLMProvider):
    """Returns a deterministic reply; signals whether retrieved context was supplied."""

    name = "mock"
    model = "mock"

    def complete(
        self, system: str, messages: list[Message], *, max_tokens: int = 1024
    ) -> str:
        last = messages[-1]["content"] if messages else ""
        has_context = "reference material" in system.lower()
        grounded = "grounded" if has_context else "ungrounded"
        return (
            "[TEST_MODE] Lodestar (HBCU career coach) would answer "
            f"{last!r} [{grounded}]."
        )

    def run_tools(
        self,
        system: str,
        messages: list[Message],
        tools: list[Tool],
        *,
        max_tokens: int = 1024,
        max_iters: int = 5,
    ) -> str:
        """Deterministically invoke the first tool once, then summarize its result."""
        last = messages[-1]["content"] if messages else ""
        if not tools:
            return f"[TEST_MODE agent] no tools available; echo: {last!r}"
        tool = tools[0]
        result = tool.func(query=str(last))
        return (
            f"[TEST_MODE agent] called tool '{tool.name}'. "
            f"Result preview: {result[:160]}"
        )
