"""FastAPI web UI for Lodestar — a single-page chat over the agentic assistant.

Run locally with ``uv run lodestar-web``. ``TEST_MODE=true`` (default) serves offline
mock answers; set ``ANTHROPIC_API_KEY`` and ``TEST_MODE=false`` for live Claude. See
``docs/deploy.md`` to deploy.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Lodestar", description="Agentic HBCU career-advice assistant")
_INDEX_HTML = (
    Path(__file__).parent / "static" / "index.html"
).read_text(encoding="utf-8")
_runtime: tuple | None = None


def _runtime_get() -> tuple:
    """Build the provider + tools once; reuse across requests (fresh agent per call)."""
    global _runtime
    if _runtime is None:
        from lodestar.app import build_agent

        agent = build_agent()
        _runtime = (agent.provider, agent.tools)
    return _runtime


class ChatIn(BaseModel):
    message: str


class ChatOut(BaseModel):
    reply: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatOut)
def chat(body: ChatIn) -> ChatOut:
    """Answer one message with a fresh (stateless) agent over the shared runtime."""
    from lodestar.agents.agent import IgniteAgent

    provider, tools = _runtime_get()
    return ChatOut(reply=IgniteAgent(provider, tools).run(body.message))


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return _INDEX_HTML


def main() -> None:
    """Entry point for the ``lodestar-web`` console script."""
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
