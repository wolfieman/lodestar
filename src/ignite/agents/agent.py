"""IgniteAgent — routes the query, then runs the provider's tool-use loop."""

from __future__ import annotations

from ignite.agents.router import route
from ignite.agents.tools import Tool
from ignite.prompts.system import build_system
from ignite.providers.base import LLMProvider, Message


class IgniteAgent:
    """Agentic career advisor: classify the request, then let the model use tools."""

    def __init__(
        self, provider: LLMProvider, tools: list[Tool], *, max_iters: int = 5
    ) -> None:
        self.provider = provider
        self.tools = tools
        self.max_iters = max_iters
        self.history: list[Message] = []

    def run(self, user_input: str) -> str:
        """Answer one user turn using routing + tool use."""
        text = user_input.strip()
        category = route(text)
        system = (
            f"{build_system()}\n\n"
            f"Routing hint: this request looks like '{category}'. Use the "
            "retrieve_knowledge tool to ground specifics, and web_search for "
            "current listings."
        )
        self.history.append({"role": "user", "content": text})
        reply = self.provider.run_tools(
            system, self.history, self.tools, max_iters=self.max_iters
        )
        self.history.append({"role": "assistant", "content": reply})
        return reply
