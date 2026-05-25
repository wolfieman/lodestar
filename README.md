# Lodestar

> A 2026 agentic, retrieval-grounded **HBCU student career-advice assistant** — model-agnostic
> (Claude by default), with hybrid RAG and an MCP server.

Lodestar evolved from **IgniteAI**, the ChatGPT custom GPT that **Team 4** built and took to
**first place at the HP Future of Work Accelerator (FOWA) 2024** (HBCU Technology Conference).
This repository holds both, side by side:

1. **Lodestar** (`src/lodestar/`, CLI `lodestar`) — the **2026 rebuild**: a model-agnostic
   agentic chatbot with hybrid RAG (LanceDB + BM25), an MCP server, and LLM-as-judge evals.
2. **IgniteAI** (`src/ignite/`, CLI `ignite`) — a faithful **reproduction** of the 2024 custom
   GPT that won (OpenAI `gpt-4o-mini`, grounded on a small knowledge base). Its spec lives in
   `product/`.

Both are **clean-room** work — written fresh from the team's architecture docs + the IgniteAI
specification, not the original GPL-3.0 team code. See `docs/decisions.md`.

## Repository layout

```
src/lodestar/   the 2026 Lodestar rebuild (agentic RAG + MCP)   — CLI: lodestar
src/ignite/     faithful reproduction of the 2024 IgniteAI GPT  — CLI: ignite
product/        IgniteAI custom-GPT spec + knowledge (what shipped in 2024)
data/           sample knowledge base for offline demo/tests
docs/           architecture, decisions, roadmap, MCP, security, IBM-curriculum mapping
competitions/   HP FOWA 2024 first-place artifacts
portfolio/      case study (problem → solution → contributions → result)
evals/          LLM-as-judge evaluation harness
tests/          unit + integration tests
```

## Quickstart

```bash
uv sync --extra dev      # create env + install deps
cp .env.example .env     # TEST_MODE=true runs offline (mock responses)

uv run lodestar          # the modern Lodestar assistant (set ANTHROPIC_API_KEY for live Claude)
uv run ignite            # the faithful IgniteAI reproduction
uv run pytest -m unit    # offline test suite
```

## Status

- ✅ **Lodestar (2026 rebuild)** — model-agnostic (default Claude) agentic chatbot with hybrid
  RAG (LanceDB + BM25), an **MCP server** (`uv run python -m lodestar.mcp_server`), and
  LLM-as-judge evals. See [`docs/roadmap.md`](docs/roadmap.md) and
  [`docs/ibm-curriculum-mapping.md`](docs/ibm-curriculum-mapping.md).
- ✅ **IgniteAI reproduction (2024)** — runnable CLI, tested; product spec captured in
  `product/`; case study + competition record in `portfolio/` and `competitions/`.

## Credits & license

IgniteAI was a team effort by HP FOWA 2024 Team 4 — see [NOTICE.md](NOTICE.md) for attribution.
This repository is authored by Wolfgang Sanyer and licensed under the **Polyform Noncommercial
License 1.0.0** ([LICENSE](LICENSE)).
