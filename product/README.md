# Product — IgniteAI (the custom GPT)

**IgniteAI** is the chatbot that HP FOWA 2024 Team 4 actually shipped and won first place
with. It is a **ChatGPT custom GPT** — a configured GPT with custom instructions, a set of
conversation starters, and uploaded knowledge files.

Live GPT: https://chatgpt.com/g/g-SnbRewUCt-igniteai

This directory is the **source of truth** for what shipped. The Python code under
`../src/lodestar/` is a runnable mirror of this product (see
`../docs/reference-vs-product.md`).

## Contents

```
ignite-ai/
├── instructions.md            # the GPT's system instructions
├── conversation-starters.md   # the GPT's suggested prompts
└── knowledge/                 # the GPT's uploaded knowledge files
```

## Status — pending export (Phase 2)

These files are exported from the live GPT by the maintainer (who has editor access). Until
then they are placeholders. Export steps are provided separately; raw exports land in the
gitignored `../_staging/gpt/` before being curated into `ignite-ai/`.
