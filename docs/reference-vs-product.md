# Reference Implementation ↔ IgniteAI (the product)

**IgniteAI (the custom GPT) is the source of truth.** Its instructions and knowledge files
(under `product/ignite-ai/`) define the behavior that won HP FOWA 2024. The Python
reference implementation in `src/lodestar/` is a faithful, runnable **mirror** of that
behavior — not a separate product.

## Mapping

| IgniteAI (custom GPT) | Reference implementation |
|---|---|
| System instructions (`product/ignite-ai/instructions.md`) | `src/lodestar/prompt.py` |
| Uploaded knowledge files (`product/ignite-ai/knowledge/`) | `data/` + `src/lodestar/knowledge.py` (retrieval) |
| Underlying model (GPT-4 family) | OpenAI `gpt-4o-mini` (`src/lodestar/chatbot.py`) |
| Conversation starters | documented in `product/ignite-ai/conversation-starters.md` |

## Reconciliation (to complete after Phase 2)

Once the IgniteAI configuration is exported into `product/ignite-ai/`, fill in a
line-by-line check that each instruction/guardrail is reflected in `prompt.py` and the
retrieval behavior, so the mirror provably tracks the product.

> Status: **pending Phase 2** (IgniteAI export) and Phase 3 (reference impl build).
