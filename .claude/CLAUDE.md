# Lodestar — IgniteAI HBCU Career-Advice Chatbot

Project context for in-repo Claude sessions. Lodestar preserves and rebuilds **IgniteAI**,
the HBCU student career-advice chatbot that won **first place at HP FOWA 2024** (Team 4).
Cross-project conventions live in `../orchestrator/`.

## Project basics

- **Origin:** HP Future of Work Accelerator (FOWA) 2024, HBCU Technology Conference — Team 4, first place.
- **Shipped product:** IgniteAI, a ChatGPT **custom GPT** (preserved under `product/`, source of truth).
- **This repo:** (a) preserve/document the custom GPT, (b) ship a clean, runnable Python **reference implementation** under `src/lodestar/` that mirrors it.
- **Stack:** Python 3.12, **uv**, OpenAI `gpt-4o-mini`, ruff, pytest.
- **Status:** Scaffolding complete; reference impl built Phase 3 (see `../orchestrator`-style plan and `docs/decisions.md`).

## Project context

Architecture, the cut-list, the clean-room boundary, and how the Python impl maps to the
custom GPT are documented in this repo's own files: `docs/architecture.md`,
`docs/decisions.md`, `docs/reference-vs-product.md`, and `portfolio/case-study.md`. Refer
to those rather than duplicating content here.

## Working rules (project-specific)

- **Clean-room:** the reference implementation is rewritten fresh from the team's own
  architecture docs + the IgniteAI spec. Do **not** copy the original GPL-3.0 team code.
- **Shell:** use **git bash**, not PowerShell.
- **Secrets:** never commit `.env` or API keys; `_staging/` is gitignored.
- **Attribution:** IgniteAI was a team effort — credit HP FOWA Team 4 (see `NOTICE.md`).

## Commit convention

Use `[LODESTAR][TYPE]` prefix. Full convention: `../orchestrator/.claude/CLAUDE.md`.
