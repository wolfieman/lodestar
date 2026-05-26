"""Native WSGI app (Flask) for Passenger / LiteSpeed LSAPI shared-hosting deploys.

The FastAPI app in ``web.py`` is ideal under uvicorn/Docker (ASGI), but LiteSpeed's
LSAPI hangs on the ASGI-to-WSGI bridge. This Flask app exposes the same routes natively
over WSGI (no bridge), reusing the same agent and single-page UI. It runs synchronously
(the Anthropic SDK call blocks), so nothing is lost by dropping ASGI here.

``TEST_MODE=true`` (default) serves offline mock answers; set ``ANTHROPIC_API_KEY`` and
``TEST_MODE=false`` for live Claude. A public live-key deploy is guarded by a per-IP
rate limit (``RATE_LIMIT_PER_MIN``, default 12) and a max message length.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request

load_dotenv()

app = Flask(__name__)
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


def _rate_limited(ip: str) -> bool:
    """True if ``ip`` exceeded RATE_LIMIT_PER_MIN requests in the last 60s."""
    now = time.time()
    recent = _hits[ip]
    while recent and now - recent[0] > 60:
        recent.popleft()
    if len(recent) >= _RATE_LIMIT:
        return True
    recent.append(now)
    return False


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.get("/")
def index():
    return Response(_INDEX_HTML, mimetype="text/html")


@app.post("/api/chat")
def chat():
    """Answer one message with a fresh (stateless) agent; rate-limited per IP."""
    ip = request.remote_addr or "?"
    if _rate_limited(ip):
        return jsonify(detail="Rate limit exceeded; try again shortly."), 429
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message or len(message) > 1000:
        return jsonify(detail="Message must be 1-1000 characters."), 400
    from lodestar.agents.agent import IgniteAgent

    provider, tools = _runtime_get()
    return jsonify(reply=IgniteAgent(provider, tools).run(message))
