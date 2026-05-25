# Quick Reference

## Daily workflow

```bash
git status
uv run ruff check . && uv run pytest -m unit   # before committing
git add -A
git commit -m "[LODESTAR][TYPE] short description"
git push
```

## Useful commands

```bash
uv sync --extra dev                 # install/refresh env
uv run lodestar                     # run the chatbot (TEST_MODE per .env)
uv run pytest                       # full suite (integration auto-skips w/o key)
uv run pytest -m unit               # offline only
uv run ruff format .                # auto-format
TEST_MODE=true uv run lodestar      # force offline for one run
```

## File locations

```
src/lodestar/   reference implementation
product/        IgniteAI custom-GPT spec + knowledge (source of truth)
data/           sample knowledge base
docs/           architecture, decisions, privacy, AI-methodology, product mapping
competitions/   HP FOWA 2024 artifacts
portfolio/      case study
_staging/       gitignored — raw recovered material
```

## Remember

- Commit often; keep `main` runnable.
- Never commit `.env` or anything under `_staging/`.
- Don't copy the original GPL team code (clean-room — see `docs/decisions.md`).

See `INSTALLATION.md` and `CONTRIBUTING.md` for details.
