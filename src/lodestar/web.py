"""FastAPI web UI for Lodestar — a single-page chat over the agentic assistant.

Run locally with ``uv run lodestar-web``. ``TEST_MODE=true`` (default) serves offline
mock answers; set ``ANTHROPIC_API_KEY`` and ``TEST_MODE=false`` for live Claude. See
``docs/deploy.md`` to deploy.

A public live-key deployment is protected by a per-IP rate limit
(``RATE_LIMIT_PER_MIN``, default 12) and a max message length.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="Lodestar", description="Agentic HBCU career-advice assistant")
_INDEX_HTML = (
    Path(__file__).parent / "static" / "index.html"
).read_text(encoding="utf-8")
_runtime: tuple | None = None

_RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MIN", "12"))
_hits: dict[str, deque] = defaultdict(deque)


def _runtime_get() -> tuple:
    """Build the provider + tools once; reuse across requests (fresh agent per call)."""
    global _runtime
    if _runtime is None:
        from lodestar.app import build_agent

        agent = build_agent()
        _runtime = (agent.provider, agent.tools)
    return _runtime


def _rate_limit(request: Request) -> None:
    """Reject an IP exceeding ``RATE_LIMIT_PER_MIN`` requests in the last 60 seconds."""
    ip = request.client.host if request.client else "?"
    now = time.time()
    recent = _hits[ip]
    while recent and now - recent[0] > 60:
        recent.popleft()
    if len(recent) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=429, detail="Rate limit exceeded; try again shortly."
        )
    recent.append(now)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ChatOut(BaseModel):
    reply: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatOut)
def chat(body: ChatIn, request: Request) -> ChatOut:
    """Answer one message with a fresh (stateless) agent; rate-limited per IP."""
    _rate_limit(request)
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
