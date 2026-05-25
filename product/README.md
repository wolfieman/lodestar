# Product — IgniteAI (the custom GPT)

**IgniteAI** is the chatbot that HP FOWA 2024 Team 4 shipped and won first place with. It is
a **ChatGPT custom GPT** — "Empowering HBCU Students with AI-Driven Career Support."

Live GPT: https://chatgpt.com/g/g-SnbRewUCt-igniteai

This directory is the **source of truth** for what shipped. The Python code under
`../src/lodestar/` is a runnable mirror of this product (see
`../docs/reference-vs-product.md`).

## What was recovered (and how)

IgniteAI is **published** (by "community builder"); the maintainer has **chat-only** access,
not edit access. Its configuration was therefore recovered by **prompt-extraction** from the
live GPT (raw captures in the gitignored `../_staging/gpt/`):

- `instructions.md` — behavioral **specification** (the GPT declines to reveal its verbatim
  hidden prompt; this captures its observed behavior, which is what the reference impl mirrors).
- `conversation-starters.md` — the four intro-screen starters, verbatim.
- `knowledge/` — **empty**: IgniteAI reported no browseable knowledge files; it is an
  **instruction-driven** GPT. The reference impl's knowledge comes from freshly authored
  sample data, not from the product (see `../docs/decisions.md`).

## Observed capability

A **`personal_context`** tool/action is invoked on most turns (personalization). Exact schema
is not inspectable without edit access.
