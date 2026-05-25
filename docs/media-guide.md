# Media Guide — infographic, video overview, and demo GIF

How to produce the visual assets for the README. The README already renders well with
Mermaid diagrams + a text transcript; these add the polish of the EV-Pulse / PWC projects.
Drop finished files in [`../assets/`](../assets/) and reference them from `README.md`.

---

## 1. NotebookLM video overview / infographic

NotebookLM is a Google web app (no API), so **you** generate these in the UI. Use the
source text below — it's written to give NotebookLM a tight, accurate brief.

**Steps**
1. Go to https://notebooklm.google.com → **New notebook**.
2. **Add source → Copy/paste text** → paste the "Source brief" below. (Optionally also add
   the repo's `README.md` and `docs/architecture.md` as sources for richer grounding.)
3. **Studio panel → Video Overview** → *Customize* with this focus prompt:
   > "Audience: technical recruiters and engineering managers. Tell the story: a first-place
   > 2024 HBCU-chatbot custom GPT (IgniteAI), rebuilt in 2026 as Lodestar — an agentic,
   > model-agnostic RAG system with an MCP server. Emphasize the architecture (router →
   > tool-use loop → hybrid retrieval), the skills demonstrated, and the 2024→2026 growth.
   > Keep it ~3 minutes, confident and concrete."
4. Generate → download the MP4 → save as `assets/lodestar-overview.mp4`.
5. For a still **infographic**, NotebookLM's *Mind map* export or Gamma/Canva works; save as
   `assets/lodestar-overview.png`.
6. Reference in README, e.g. `![Lodestar overview](assets/lodestar-overview.png)` and
   `▶️ **[Watch the 3-min overview](assets/lodestar-overview.mp4)**`.

### Source brief (paste into NotebookLM)

> **Lodestar** is a 2026 agentic, retrieval-grounded AI career assistant for students at
> Historically Black Colleges and Universities (HBCUs). It evolved from **IgniteAI**, a
> ChatGPT custom GPT that the author's team built and took to **first place at the HP Future
> of Work Accelerator (FOWA) 2024** at the HBCU Technology Conference.
>
> Lodestar is a clean-room rebuild that turns that prototype into a real system:
> - **Model-agnostic** LLM layer — defaults to Anthropic Claude, with an OpenAI adapter — so
>   it isn't locked to one vendor.
> - **Hybrid retrieval-augmented generation (RAG)** — combines BM25 keyword search with dense
>   vector search (LanceDB + fastembed embeddings), fused via Reciprocal Rank Fusion, so
>   answers are grounded in a knowledge base of career, scholarship, internship, and academic
>   guidance.
> - **Agentic tool-use** — a router classifies the question, then a Claude tool-use loop
>   decides when to retrieve knowledge or search the web before answering.
> - **Model Context Protocol (MCP) server** — Lodestar exposes its tools over MCP, so it plugs
>   directly into Claude Desktop and other MCP clients.
> - **Evaluation & governance** — an LLM-as-judge evaluation harness scores answer quality,
>   and the design follows the OWASP LLM Top-10 and FERPA/GDPR data-handling practices.
> - Built in Python 3.14 with uv, ruff, and pytest; CI-tested; runs fully offline in a test
>   mode. The scope was driven by IBM's "AI Periodic Table" curriculum (RAG, agents, MCP, AI
>   security, governance).
>
> The repository also preserves a faithful reproduction of the original 2024 IgniteAI custom
> GPT, so the before-and-after evolution is visible side by side. Author: Wolfgang Sanyer;
> the original IgniteAI was a team effort by HP FOWA 2024 Team 4.

---

## 2. Terminal demo GIF

Record `uv run lodestar` answering a question. Two easy options:

**Option A — [vhs](https://github.com/charmbracelet/vhs)** (scripted, reproducible). Create
`docs/demo.tape`:
```tape
Output assets/lodestar-demo.gif
Set FontSize 18
Set Width 1100
Set Height 640
Type "uv run lodestar" Enter
Sleep 3s
Type "How do I find scholarships for HBCU STEM students?" Enter
Sleep 8s
Type "quit" Enter
```
Then: `vhs docs/demo.tape` → produces `assets/lodestar-demo.gif`.

**Option B — asciinema + agg:** `asciinema rec demo.cast` → run the chat → `agg demo.cast
assets/lodestar-demo.gif`.

Reference in README: `![Lodestar demo](assets/lodestar-demo.gif)`.

> Tip: run with `TEST_MODE=false` and `ANTHROPIC_API_KEY` set for a real Claude answer in the
> GIF, or leave `TEST_MODE=true` for a fast, offline, deterministic recording.
