# Lodestar — IgniteAI

> An HBCU student career-advice chatbot. Built by **Team 4** at the **HP Future of Work
> Accelerator (FOWA) 2024** (HBCU Technology Conference), where it won **first place**.

This repository consolidates and rebuilds that project into one clean home:

1. **The product** (`product/`) — **IgniteAI**, the ChatGPT *custom GPT* that actually
   shipped and won. Preserved here as the source of truth.
2. **A reference implementation** (`src/lodestar/`) — a clean, runnable Python mirror of
   that behavior: OpenAI `gpt-4o-mini` grounded on an academic / career / internship
   knowledge base, runnable from the command line.

The reference implementation is a **clean-room rewrite** from the team's own architecture
documentation and the IgniteAI specification — it does not reuse the original GPL-3.0 team
codebase. See `docs/decisions.md`.

## Repository layout

```
product/        IgniteAI custom-GPT spec + knowledge (what shipped)
src/lodestar/   reference implementation (CLI chatbot)
data/           sample knowledge base for offline demo/tests
docs/           architecture, decisions, privacy, AI-methodology, product mapping
competitions/   HP FOWA 2024 first-place artifacts
portfolio/      case study (problem → solution → contributions → result)
tests/          unit + integration tests
```

## Quickstart

```bash
uv sync --extra dev          # create env + install deps
cp .env.example .env         # TEST_MODE=true runs offline (mock responses)
uv run lodestar              # start the chatbot REPL
uv run pytest -m unit        # run the offline test suite
```

Set `OPENAI_API_KEY` in `.env` and `TEST_MODE=false` for real model responses.

## Status

- ✅ **Track A — as-shipped reproduction:** runnable CLI (`uv run lodestar`), tested, lint-clean;
  IgniteAI product spec captured in `product/`; case study + competition record written.
- ✅ **Track B — modernized rebuild** (`src/ignite/`, CLI `ignite`): model-agnostic
  (default Claude) agentic chatbot with hybrid RAG (LanceDB + BM25), an **MCP server**, and
  LLM-as-judge evals. `uv run ignite` · `uv run python -m ignite.mcp_server` ·
  see [`docs/roadmap.md`](docs/roadmap.md) and [`docs/ibm-curriculum-mapping.md`](docs/ibm-curriculum-mapping.md).

## Credits & license

IgniteAI was a team effort by HP FOWA 2024 Team 4 — see [NOTICE.md](NOTICE.md) for
attribution. This repository is authored by Wolfgang Sanyer and licensed under the
**Polyform Noncommercial License 1.0.0** ([LICENSE](LICENSE)).
