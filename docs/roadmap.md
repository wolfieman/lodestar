# Roadmap — Two Tracks

Lodestar is developed as two deliberate tracks in one repository, so it both **documents
the win** and **demonstrates current skill**.

## Track A — As-shipped reproduction (v1) ✅ built

A faithful, runnable mirror of the **2024 IgniteAI custom GPT** that won HP FOWA first place.
- `src/ignite/` — CLI chatbot, `gpt-4o-mini`, keyword retrieval over a small knowledge base.
- Clean-room (no GPL team code), tested, documented.
- **Purpose:** an honest record of what shipped. This track stays intentionally simple,
  matching the original product. It will be tagged (e.g. `v1-reproduction`) when frozen.

## Track B — Modernized rebuild (2026) ✅ built

The modern rebuild in `src/lodestar/` (CLI `lodestar`), realizing the architecture the team
*designed but never built*, with current AI:

- **Model-agnostic provider layer** (`providers/`), default **Claude** (`claude-sonnet-4-6`,
  prompt caching); optional OpenAI adapter; offline mock for tests/TEST_MODE.
- **Hybrid RAG** (`retrieval/`): fastembed embeddings + **LanceDB** vector store + **BM25**
  sparse, fused with Reciprocal Rank Fusion.
- **Agentic** tool use (`agents/`): keyword router → Claude native tool-use loop with
  `retrieve_knowledge` + `web_search` tools.
- **MCP server** (`mcp_server.py`) exposing Lodestar to Claude Desktop / MCP clients.
- **LLM-as-judge evals** (`evals/`) + **security** (`safety.py`; `docs/security.md`: OWASP
  LLM Top-10 + FERPA).
- Python 3.14, uv, ruff, pytest; offline-runnable via `TEST_MODE` (mock + hash embeddings).
- Concept mapping to the IBM curriculum: `docs/ibm-curriculum-mapping.md`.

**Deferred (separate effort):** FastAPI + web chat UI + deployment.

**Purpose:** the forward-looking portfolio piece — shows growth from the 2024 prototype.

## How the tracks coexist

The v1 reproduction is kept (tagged `v1-reproduction`) in `src/ignite/` (CLI `ignite`);
the v2 rebuild lives alongside it in `src/lodestar/` (CLI `lodestar`), so the evolution is visible
side by side in one repo.

## Narrative

"Won first place at HP FOWA 2024 with the IgniteAI custom GPT. Reproduced it faithfully,
then rebuilt it in 2026 as a production-grade system realizing the original architecture."
