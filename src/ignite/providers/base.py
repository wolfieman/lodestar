"""Model-agnostic LLM provider interface."""

from __future__ import annotations

from abc import ABC, abstractmethod

Message = dict[str, str]


class LLMProvider(ABC):
    """A chat-completion provider behind a single, model-agnostic interface."""

    name: str = "base"
    model: str = ""

    @abstractmethod
    def complete(
        self, system: str, messages: list[Message], *, max_tokens: int = 1024
    ) -> str:
        """Return the assistant's reply given a system prompt and message history."""
