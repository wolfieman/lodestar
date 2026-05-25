"""Anthropic (Claude) provider — the default for IgniteAI."""

from __future__ import annotations

import os

from ignite.providers.base import LLMProvider, Message

DEFAULT_MODEL = "claude-sonnet-4-6"


class AnthropicProvider(LLMProvider):
    """Claude via the Anthropic SDK, with prompt caching on the system prefix."""

    name = "anthropic"

    def __init__(self, model: str | None = None) -> None:
        self.model = model or os.getenv("IGNITE_MODEL", DEFAULT_MODEL)
        self._client = None

    def _client_lazy(self):
        if self._client is None:
            from anthropic import Anthropic

            self._client = Anthropic()
        return self._client

    def complete(
        self, system: str, messages: list[Message], *, max_tokens: int = 1024
    ) -> str:
        client = self._client_lazy()
        resp = client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=[
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=messages,
        )
        return "".join(b.text for b in resp.content if b.type == "text")
