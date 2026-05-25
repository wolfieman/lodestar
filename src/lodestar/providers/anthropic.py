"""Anthropic (Claude) provider — the default for Lodestar."""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

from lodestar.providers.base import LLMProvider, Message

if TYPE_CHECKING:
    from lodestar.agents.tools import Tool

DEFAULT_MODEL = "claude-sonnet-4-6"


class AnthropicProvider(LLMProvider):
    """Claude via the Anthropic SDK, with prompt caching on the system prefix."""

    name = "anthropic"

    def __init__(self, model: str | None = None) -> None:
        self.model = model or os.getenv("LODESTAR_MODEL", DEFAULT_MODEL)
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

    def run_tools(
        self,
        system: str,
        messages: list[Message],
        tools: list[Tool],
        *,
        max_tokens: int = 1024,
        max_iters: int = 5,
    ) -> str:
        """Drive Claude's native tool-use loop until it returns a final answer."""
        client = self._client_lazy()
        specs = [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema,
            }
            for t in tools
        ]
        tool_map = {t.name: t for t in tools}
        sys_block = [
            {"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}
        ]
        convo: list = list(messages)
        for _ in range(max_iters):
            resp = client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=sys_block,
                tools=specs,
                messages=convo,
            )
            convo.append({"role": "assistant", "content": resp.content})
            if resp.stop_reason != "tool_use":
                return "".join(b.text for b in resp.content if b.type == "text")
            results = []
            for block in resp.content:
                if block.type == "tool_use":
                    tool = tool_map.get(block.name)
                    output = (
                        tool.func(**block.input)
                        if tool
                        else f"Unknown tool: {block.name}"
                    )
                    results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": output,
                        }
                    )
            convo.append({"role": "user", "content": results})
        return "I couldn't complete that within the allotted reasoning steps."
