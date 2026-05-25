# Roadmap — Two Tracks

Lodestar is developed as two deliberate tracks in one repository, so it both **documents
the win** and **demonstrates current skill**.

## Track A — As-shipped reproduction (v1) ✅ built

A faithful, runnable mirror of the **2024 IgniteAI custom GPT** that won HP FOWA first place.
- `src/lodestar/` — CLI chatbot, `gpt-4o-mini`, keyword retrieval over a small knowledge base.
- Clean-room (no GPL team code), tested, documented.
- **Purpose:** an honest record of what shipped. This track stays intentionally simple,
  matching the original product. It will be tagged (e.g. `v1-reproduction`) when frozen.

## Track B — Modernized v2 (2026) — to design

Realize the ambitious architecture the team *designed but never built* (Airtable, Make.com,
Perplexity, multi-source data, FERPA/GDPR), using current AI. Candidate scope (to be set in
a dedicated design pass):

- Current frontier model(s); **model-agnostic** provider layer.
- **Real retrieval** (embeddings/vector search) and/or an **agentic** tool-using design.
- Implement the **data integrations** the docs envisioned (real career/scholarship/internship
  sources, web search).
- **Evals** to demonstrate answer quality, not just that it runs.
- Optional **frontend + deployment**.

**Purpose:** the forward-looking portfolio piece — shows growth from the 2024 prototype.

## How the tracks coexist

The v1 reproduction is kept (frozen/tagged) as the baseline; v2 is built as a distinct,
clearly-labeled track in the same repo so the evolution is visible side by side. The exact
package/dir layout for v2 is decided at the start of its design pass.

## Narrative

"Won first place at HP FOWA 2024 with the IgniteAI custom GPT. Reproduced it faithfully,
then rebuilt it in 2026 as a production-grade system realizing the original architecture."
