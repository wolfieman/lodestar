# IgniteAI — System Architecture

This is the **intended production architecture** for IgniteAI as designed by HP FOWA 2024
Team 4. (Adapted from the team's `ims_reqs_and_architecture.md`, originally authored by
Wolfgang Sanyer.) The local reference implementation in this repo implements a deliberately
simplified subset — see [decisions.md](decisions.md) and [reference-vs-product.md](reference-vs-product.md).

## Information system requirements

1. **User volume & scalability** — designed for ~2,500 students per campus; auto-scaling
   groups and load balancing for traffic spikes.
2. **Data sources & integration**
   - *Academic advice:* university academic databases (courses, schedules, faculty) +
     external platforms (Khan Academy, Coursera, edX).
   - *Career counseling:* university career-services data + job portals (Indeed, LinkedIn,
     Glassdoor).
   - *Internships:* university internship programs + industry-partner APIs.
3. **Security & compliance**
   - *FERPA:* encryption at rest and in transit, strict access controls, audit trails.
   - *GDPR:* data minimization, explicit user consent, right to access and erasure.
4. **Performance & availability** — cloud infrastructure (AWS/Azure/GCP), monitoring and
   alerting, regular backups and a disaster-recovery plan.
5. **Interaction & feedback** — interaction logging and analytics for continuous improvement.

## High-level architecture

1. **Frontend interface** — web/mobile app where students chat with IgniteAI.
2. **Chatbot engine** — OpenAI GPT, augmented with Perplexity for advanced query handling.
3. **Backend services**
   - *Data integration layer* — APIs to internal and external data sources.
   - *Database* — Airtable for structured data (interactions, resources, internship listings).
   - *Workflow automation* — Make.com to orchestrate services.
4. **Security layer** — encryption, access controls, compliance checks.
5. **Logging & analytics** — interaction logging plus analytics tooling for insights.
6. **Scalability & performance** — cloud infrastructure with auto-scaling and load balancing.

## What the reference implementation covers

The Python reference implementation is a **local, single-user CLI** that captures the core
conversational behavior:

- **Chatbot engine** → OpenAI `gpt-4o-mini` (`src/ignite/chatbot.py`).
- **Knowledge grounding** → a lightweight retrieval layer over a local
  academic/career/internship knowledge base (`src/ignite/knowledge.py`), standing in for
  the Airtable-backed data integration layer.
- **Data handling** → a Fernet encryption helper (`src/ignite/privacy.py`) demonstrating
  the FERPA/GDPR posture.

Out of scope locally: the web/mobile frontend, Perplexity augmentation, Airtable, Make.com
automation, and cloud auto-scaling. These remain documented here as the production design.

## What the Track B rebuild implements

The 2026 rebuild (`src/lodestar/`) advances much of this design into real, runnable code
(see `roadmap.md` and `ibm-curriculum-mapping.md`):

- **Chatbot engine** → model-agnostic provider layer, default Claude (`providers/`), replacing
  the single hard-coded model.
- **Knowledge grounding** → real **hybrid retrieval**: fastembed embeddings in a LanceDB
  vector store, fused with BM25 (`retrieval/`) — the dense/sparse/hybrid strategies, not
  keyword-only.
- **Agentic orchestration** → a router + tool-use loop (`agents/`) where the model decides
  when to retrieve or search — the "data integration via tools" idea, realized.
- **Integration surface** → Lodestar is exposed as an **MCP server** (`mcp_server.py`), the
  modern vendor-neutral way to connect tools/clients (in place of bespoke API glue).
- **Governance** → LLM-as-judge evals (`evals/`) and an OWASP/FERPA security posture
  (`security.md`).

Still deferred to a production pass: the web/mobile frontend + deployment, a live
(sandboxed) search backend, Airtable/Make.com, and cloud auto-scaling.
