# Lodestar — IgniteAI HBCU Career-Advice Chatbot

Project context for in-repo Claude sessions. Lodestar preserves and rebuilds **IgniteAI**,
the HBCU student career-advice chatbot that won **first place at HP FOWA 2024** (Team 4).
Cross-project conventions live in `../orchestrator/`.

## Project basics

- **Origin:** HP Future of Work Accelerator (FOWA) 2024, HBCU Technology Conference — Team 4, first place.
- **Shipped product:** IgniteAI, a ChatGPT **custom GPT** (preserved under `product/`, source of truth).
- **This repo:** (a) preserve/document the custom GPT, (b) ship a clean, runnable Python **reference implementation** under `src/ignite/` that mirrors it.
- **Stack:** Python 3.14, **uv**, ruff, pytest. v1 (`src/ignite/`) uses OpenAI `gpt-4o-mini`; v2 rebuild (`src/lodestar/`) is model-agnostic (default Claude) with hybrid RAG, agentic tool-use, and an MCP server.
- **Status:** Both tracks built. v1 tagged `v1-reproduction`; v2 = `src/lodestar/` (CLI `lodestar`; MCP via `uv run python -m lodestar.mcp_server`; evals in `evals/`). See `docs/roadmap.md` + `docs/ibm-curriculum-mapping.md`.

## Project context

Architecture, the cut-list, the clean-room boundary, and how the Python impl maps to the
custom GPT are documented in this repo's own files: `docs/architecture.md`,
`docs/decisions.md`, `docs/reference-vs-product.md`, and `portfolio/case-study.md`. Refer
to those rather than duplicating content here.

## Working rules (project-specific)

- **Clean-room:** the reference implementation is rewritten fresh from the team's own
  architecture docs + the IgniteAI spec. Do **not** copy the original GPL-3.0 team code —
  this keeps the rewrite clean-room and avoids inheriting GPL-3.0 licensing obligations.
- **Shell:** use **git bash**, not PowerShell (owner's cross-project standard; the repo's
  POSIX tooling and hooks assume a bash environment).
- **Secrets:** never commit `.env` or API keys; `_staging/` is gitignored.
- **Attribution:** IgniteAI was a team effort — credit HP FOWA Team 4 (see `NOTICE.md`).

## Commit convention

Use `[LODESTAR][TYPE]` prefix. Full convention: `../orchestrator/.claude/CLAUDE.md`.
