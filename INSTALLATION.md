# Installation

## Prerequisites

- **Python 3.12** (pinned in `.python-version`)
- **uv** — https://docs.astral.sh/uv/ (manages the environment and dependencies)
- **Git** (use **git bash** on Windows)
- An **OpenAI API key** (only needed for real responses; the offline mock needs none)

## Quick start

```bash
# from the repo root
uv sync --extra dev          # create .venv, install runtime + dev deps, write uv.lock
cp .env.example .env         # TEST_MODE=true → runs offline with mock responses
uv run lodestar              # start the chatbot REPL
```

For real model responses, edit `.env`:

```
OPENAI_API_KEY=sk-...
TEST_MODE=false
```

## Verify

```bash
uv run ruff check .          # lint
uv run pytest -m unit        # offline tests
```

## Troubleshooting

- **`uv` not found** — install uv, then reopen the shell.
- **Wrong Python** — `uv python install 3.12`, then `uv sync` again.
- **Auth errors with `TEST_MODE=false`** — confirm `OPENAI_API_KEY` is set in `.env` and valid.

See `QUICK-REFERENCE.md` for the daily workflow.
