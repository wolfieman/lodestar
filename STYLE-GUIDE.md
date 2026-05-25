# Style Guide

Conventions for the Lodestar reference implementation. Small, readable, explicit.

## Design philosophy

- **Python-first, functions over classes** unless state genuinely warrants a class.
- **Explicit over clever.** Readability beats brevity.
- **Boundaries are defensive, internals trust their inputs.** Validate at the edges
  (env, API responses, file/CSV parsing); don't re-check inside the call graph.
- **Measure before optimizing**; add structure only when it earns its keep (rule of three).

## Naming

| Thing | Convention | Example |
|---|---|---|
| Directories | kebab-case | `product/ignite-ai/` |
| Modules / files | snake_case | `knowledge.py` |
| Functions / vars | snake_case | `retrieve_context()` |
| Classes | PascalCase | `Chatbot` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_MODEL` |

## Language features

- Use **type hints** on public functions; `from __future__ import annotations`.
- Prefer `dataclasses`, `pathlib`, comprehensions, and generators.
- Avoid metaprogramming, deep class hierarchies, and global mutable state.

## Configuration

- Secrets and runtime flags via **`.env`** (`OPENAI_API_KEY`, `TEST_MODE`) loaded with
  `python-dotenv`. Never hardcode keys; never prompt for them with `input()`.
- Module-level constants for fixed settings (model name, top-k retrieval).

## Error handling

- Fail clearly at boundaries with actionable messages (missing key, unreadable data file).
- Wrap external API calls; surface a friendly message rather than a raw traceback in the CLI.

## Testing

- **unit** — pure logic and the chatbot with the `TEST_MODE` mock; no network.
- **contract** — assumptions about the OpenAI response shape.
- **integration** — real API calls (`@pytest.mark.integration`), skipped without a key.
- Write tests alongside the code they cover in `tests/`.

## Tooling

- ruff: line-length 88, rules E/F/W/I (`pyproject.toml`).
- Google-style docstrings on public functions.
