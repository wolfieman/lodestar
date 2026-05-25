"""Optional OpenAI provider — kept so the system is genuinely model-agnostic.

Wolfgang defaults to Claude; this adapter exists for completeness/portability.
"""

from __future__ import annotations

import os

from ignite.providers.base import LLMProvider, Message

DEFAULT_MODEL = "gpt-4o-mini"


class OpenAIProvider(LLMProvider):
    """OpenAI chat-completions behind the same interface as the Claude provider."""

    name = "openai"

    def __init__(self, model: str | None = None) -> None:
        self.model = model or os.getenv("IGNITE_MODEL", DEFAULT_MODEL)
        self._client = None

    def _client_lazy(self):
        if self._client is None:
            from openai import OpenAI

            self._client = OpenAI()
        return self._client

    def complete(
        self, system: str, messages: list[Message], *, max_tokens: int = 1024
    ) -> str:
        client = self._client_lazy()
        full: list[Message] = [{"role": "system", "content": system}, *messages]
        resp = client.chat.completions.create(
            model=self.model, messages=full, max_tokens=max_tokens
        )
        return resp.choices[0].message.content or ""
