"""IgniteAI reference chatbot: ``gpt-4o-mini`` over a local knowledge base.

Clean-room reimplementation written from ``product/ignite-ai/instructions.md``. A
``TEST_MODE`` gate returns a deterministic mock so the chatbot runs offline and unit
tests need no API key.
"""

from __future__ import annotations

import os

from openai import OpenAI

from lodestar.knowledge import KnowledgeBase, Snippet, format_snippets
from lodestar.prompt import system_message

DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_TOP_K = 3
_TRUTHY = {"1", "true", "yes", "on"}


def preprocess_input(text: str) -> str:
    """Normalize raw user input before use."""
    return text.strip()


def env_test_mode() -> bool:
    """Return whether ``TEST_MODE`` is enabled in the environment (default: on)."""
    return os.getenv("TEST_MODE", "true").strip().lower() in _TRUTHY


class Chatbot:
    """Conversational career coach mirroring the IgniteAI custom GPT."""

    def __init__(
        self,
        *,
        model: str = DEFAULT_MODEL,
        test_mode: bool | None = None,
        knowledge: KnowledgeBase | None = None,
        top_k: int = DEFAULT_TOP_K,
    ) -> None:
        self.model = model
        self.test_mode = env_test_mode() if test_mode is None else test_mode
        self.knowledge = knowledge or KnowledgeBase.load()
        self.top_k = top_k
        self.history: list[dict[str, str]] = []
        self._client: OpenAI | None = None

    def respond(self, user_input: str) -> str:
        """Reply to one user message, grounding on retrieved knowledge."""
        text = preprocess_input(user_input)
        snippets = self.knowledge.retrieve(text, k=self.top_k)
        self.history.append({"role": "user", "content": text})
        if self.test_mode:
            reply = self._mock_reply(text, snippets)
        else:
            reply = self._call_openai(format_snippets(snippets))
        self.history.append({"role": "assistant", "content": reply})
        return reply

    def _mock_reply(self, text: str, snippets: list[Snippet]) -> str:
        topics = ", ".join(s.title for s in snippets) or "general career guidance"
        return (
            "[TEST_MODE] IgniteAI, an HBCU career coach, would answer "
            f'"{text}" drawing on: {topics}.'
        )

    def _call_openai(self, context: str) -> str:
        if self._client is None:
            self._client = OpenAI()
        messages: list[dict[str, str]] = [
            {"role": "system", "content": system_message(context)}
        ]
        messages.extend(self.history)
        response = self._client.chat.completions.create(
            model=self.model,
            messages=messages,
        )
        return response.choices[0].message.content or ""
