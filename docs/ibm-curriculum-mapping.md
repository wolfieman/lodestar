# IBM "AI Periodic Table" Curriculum → IgniteAI Rebuild

The Track B rebuild's scope is driven by Wolfgang's IBM Technology AI curriculum
(`../../infrastructure-consulting/career/learning/ibm-tech-ai-curriculum.md`), organized
around the **AI Periodic Table**. This maps each curriculum track to what `src/ignite/`
actually implements.

| Curriculum track | Concept | Where it lives in IgniteAI |
|---|---|---|
| **Foundations** (AI stack, anatomy of agents) | how LLMs + RAG + agents compose | `app.py` wiring of provider + retrieval + agent layers |
| **RAG** (sparse / dense / hybrid, vector DBs) | retrieval-augmented generation | `retrieval/`: fastembed embeddings, **LanceDB** vector store (`vector_store.py`), **BM25** (`sparse.py`), **RRF** hybrid (`hybrid.py`) |
| **Agents** (tool use, router, orchestration) | agentic systems | `agents/`: keyword `router.py` → `IgniteAgent` tool-use loop; native tool use in `providers/anthropic.py::run_tools` |
| **MCP** (expose tools; MCP vs API / RAG) | Model Context Protocol | `mcp_server.py` exposes IgniteAI as an MCP server (`retrieve_knowledge`, `get_career_advice`) |
| **AI Security** (OWASP, prompt injection) | securing LLM apps | system-prompt guardrails (`prompts/system.py`), PII detection (`safety.py`), `docs/security.md` |
| **Governance** (monitoring, evals) | measuring quality | `evals/`: LLM-as-judge harness + rubric |
| Applied / executive positioning | consulting vocabulary | informs the case study / portfolio framing — not the code |

**Model-agnostic** provider layer (`providers/`, default Claude) reflects the curriculum's
"MCP as vendor-convergence" framing: IgniteAI is not locked to a single model vendor.

**Not yet built (deferred):** a web UI + deployment, and a real (sandboxed) `web_search`
backend — documented as production design in `docs/architecture.md`.
