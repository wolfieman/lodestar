# Contributing

## General principles

- **Keep `main` runnable.** Every commit on `main` should pass `uv run pytest -m unit` and
  `uv run ruff check .`.
- **Small, focused changes.** One logical change per commit.
- **Clean-room boundary.** Do not copy code from the original GPL-3.0 team repos. The
  reference implementation is rewritten from the architecture docs + the IgniteAI spec
  (see `docs/decisions.md`).
- **No secrets in git.** API keys live in `.env` (gitignored). Recovered raw material lives
  in `_staging/` (gitignored).

## Style

- Format and lint with **ruff**: `uv run ruff check .` and `uv run ruff format .`
  (line-length 88, rules E/F/W/I).
- See `STYLE-GUIDE.md` for conventions.

## Branching

- `main` is always runnable.
- Feature branches: `feat-*`, `fix-*`, `docs-*`, `chore-*`.

## Commits

Format: `[LODESTAR][TYPE] short description` (≤50 chars for the description).
Types: `FEAT`, `FIX`, `DOCS`, `META`, `REFAC`, `CHORE`, `TEST`.
Full convention: `../orchestrator/.claude/CLAUDE.md`. **Never** add AI co-authorship trailers.

## Testing

- `uv run pytest -m unit` — fast, offline (uses `TEST_MODE` mock). Must pass before commit.
- `uv run pytest -m integration` — calls the live OpenAI API; needs `OPENAI_API_KEY` and
  `TEST_MODE=false`; costs tokens. Optional locally.

## Definition of done

- [ ] Code runs: `uv run lodestar` works in `TEST_MODE`.
- [ ] `uv run pytest -m unit` green.
- [ ] `uv run ruff check .` clean.
- [ ] Docs updated if behavior or structure changed.
- [ ] No secrets committed; `.env` and `_staging/` untracked.

## Development setup

```bash
git clone <repo> lodestar && cd lodestar
uv sync --extra dev
cp .env.example .env
uv run pytest -m unit
```
