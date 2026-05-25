"""Model-agnostic LLM provider interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from lodestar.agents.tools import Tool

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

    def run_tools(
        self,
        system: str,
        messages: list[Message],
        tools: list[Tool],
        *,
        max_tokens: int = 1024,
        max_iters: int = 5,
    ) -> str:
        """Run an agentic tool-use loop and return the final text.

        Optional capability — providers that support tool use override this.
        """
        raise NotImplementedError(f"{self.name} provider does not support tool use")
