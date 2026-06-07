# Installation

## Prerequisites

- **Python 3.14** (pinned in `.python-version`; install from https://www.python.org or your OS package manager)
- **uv** — https://docs.astral.sh/uv/ (manages the environment and dependencies)
- **Git** (use **git bash** on Windows)
- An **Anthropic API key** (only needed for real Claude responses; the offline mock needs none. An OpenAI key works too via the optional provider — see `.env.example`.)

## Quick start

```bash
# from the repo root
uv sync --extra dev          # create .venv, install runtime + dev deps
cp .env.example .env         # TEST_MODE=true → runs offline with mock responses
uv run lodestar              # start the chatbot REPL
```

For real model responses, edit `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
TEST_MODE=false
```

(Optional: set `LODESTAR_PROVIDER=openai` + `OPENAI_API_KEY` to use OpenAI instead —
the provider layer is model-agnostic.)

## Other ways to run it

- **Web UI:** `uv run lodestar-web` → http://127.0.0.1:8000
- **Docker:** `docker build -t lodestar . && docker run -p 8000:8000 lodestar`
  (offline by default; see the `Dockerfile` header for live mode)
- **MCP server** (plug Lodestar into Claude Desktop / any MCP client):
  `uv run python -m lodestar.mcp_server` — see `docs/mcp.md`

## Verify

```bash
uv run ruff check .          # lint
uv run pytest -m unit        # offline tests
```

## Troubleshooting

- **`uv` not found** — install uv, then reopen the shell.
- **Wrong Python** — install Python 3.14, then run `uv sync` again.
- **Auth errors with `TEST_MODE=false`** — confirm `ANTHROPIC_API_KEY` is set in
  `.env` and valid (or `OPENAI_API_KEY` if you switched providers).

See `QUICK-REFERENCE.md` for the daily workflow.
