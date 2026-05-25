"""Offline, deterministic provider for TEST_MODE and unit tests (no network/key)."""

from __future__ import annotations

from ignite.providers.base import LLMProvider, Message


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
            "[TEST_MODE] IgniteAI (HBCU career coach) would answer "
            f"{last!r} [{grounded}]."
        )
