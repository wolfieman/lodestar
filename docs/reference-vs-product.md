# Reference Implementation ↔ IgniteAI (the product)

**IgniteAI (the custom GPT) is the source of truth.** Its instructions and knowledge files
(under `product/ignite-ai/`) define the behavior that won HP FOWA 2024. The Python
reference implementation in `src/ignite/` is a faithful, runnable **mirror** of that
behavior — not a separate product.

## Mapping

| IgniteAI (custom GPT) | Reference implementation |
|---|---|
| System instructions (`product/ignite-ai/instructions.md`) | `src/ignite/prompt.py` |
| Uploaded knowledge files (`product/ignite-ai/knowledge/`) | `data/` + `src/ignite/knowledge.py` (retrieval) |
| Underlying model (GPT-4 family) | OpenAI `gpt-4o-mini` (`src/ignite/chatbot.py`) |
| Conversation starters | documented in `product/ignite-ai/conversation-starters.md` |

## Reconciliation

The product spec (`product/ignite-ai/`) was recovered by prompt-extraction (chat-only
access) and the reference impl is built to match it:

- **Persona, scope, response style, guardrails** from `instructions.md` → encoded in
  `SYSTEM_PROMPT` (`src/ignite/prompt.py`). Verified against the four behavior samples in
  `_staging/gpt/05-behavior-samples.md` (structured, encouraging, projects-over-credentials,
  asks clarifying questions, offers next steps).
- **Model:** GPT-4 family → `gpt-4o-mini` in `src/ignite/chatbot.py`.
- **`personal_context` tool:** not replicated (no user-profile store); its "tailor to the
  user" effect is approximated by the system prompt.

## One deliberate divergence

IgniteAI is **instruction-driven** (it reported no knowledge files). The reference impl
**adds** a small local knowledge base + retrieval (`data/knowledge.json`,
`src/ignite/knowledge.py`) so it can run as a self-contained, grounded demo. This is an
enhancement for runnability, not a claim that the original GPT did retrieval — noted here
and in `decisions.md`. The sample data is freshly authored, not copied.
