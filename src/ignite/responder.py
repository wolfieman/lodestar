"""RAG-grounded responder: retrieve context, then ask the provider."""

from __future__ import annotations

from ignite.prompts.system import build_system
from ignite.providers.base import LLMProvider, Message
from ignite.retrieval.base import Retriever
from ignite.retrieval.knowledge import format_snippets


class Responder:
    """Single-turn-aware chat: grounds each reply in retrieved knowledge."""

    def __init__(
        self, provider: LLMProvider, retriever: Retriever, *, top_k: int = 4
    ) -> None:
        self.provider = provider
        self.retriever = retriever
        self.top_k = top_k
        self.history: list[Message] = []

    def respond(self, user_input: str) -> str:
        """Reply to one user message, grounding on retrieved snippets."""
        text = user_input.strip()
        snippets = self.retriever.retrieve(text, k=self.top_k)
        system = build_system(format_snippets(snippets))
        self.history.append({"role": "user", "content": text})
        reply = self.provider.complete(system, self.history)
        self.history.append({"role": "assistant", "content": reply})
        return reply
