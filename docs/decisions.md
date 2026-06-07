# Design Decisions

Rationale for how Lodestar was consolidated and rebuilt. Keep this current as choices change.

## 1. Clean-room rewrite (license-critical)

The original team code (the `wolfgang` branch of `jacross9/FOWA---HBCU-Student-Chatbot-Group-4`
and its mirror `wolfieman/pathway`) is licensed **GPL-3.0** and is a joint work of HP FOWA
2024 Team 4. Polyform Noncommercial is incompatible with GPL, and relicensing GPL code
requires every author's consent.

**Decision:** rewrite the reference implementation **fresh** from (a) the team's own
architecture documentation (`docs/architecture.md`, originally authored by Wolfgang in the
`fowa24Team4` repo) and (b) the IgniteAI product specification exported from the custom GPT.
The original code informs *intent only* — **no code is copied**. The result is original
work that licenses cleanly under Polyform Noncommercial 1.0.0.

**Do NOT copy:** the `wolfgang`-branch source files, the three GPL data CSVs, the upstream
GPL `LICENSE`, or `tests/check_quota_limit.py`.

## 2. Cut-list (what does not apply)

- **The entire `main` branch** of the upstream repos — abandoned GPT-2 fine-tuning
  scaffolding (`app.py`, `model_training.py`, `data_preprocessing.py` with a placeholder
  dataset path, a Flask server loading a nonexistent `./results/checkpoint-last`). Never
  functional; the shipped product was a custom GPT, not a fine-tuned GPT-2.
- GPT-2 / `transformers` / `torch` / `nltk` dependencies, `metrics.py` (sklearn accuracy),
  and the Flask-serving path.

## 3. Keep / mirror

- The **OpenAI `gpt-4o-mini`** approach with a `TEST_MODE` mock (re-implemented).
- A small **Fernet** encryption helper as a FERPA/GDPR data-handling demo (re-implemented).
- The academic / career / internship **knowledge structure** (re-created as fresh sample
  data; real knowledge derives from the Phase-2 IgniteAI export).

## 4. Reference impl shape

- **CLI-first** (`uv run ignite`). A web/API layer is explicitly out of scope; the
  upstream GPT-2 Flask app is cut.
- **Retrieval** is dependency-light (keyword / TF-IDF over the knowledge base), not an
  embeddings/vector database — matches "simple knowledge base." Revisit if embeddings are
  wanted later.
- **Airtable / Make.com / Perplexity** from the production architecture are **not**
  implemented locally; they are documented in `docs/architecture.md` as the intended
  production design.

## 5. Tooling

- **Python:** v1 reproduction pinned 3.12; the **Track B rebuild bumped to 3.14** (matching
  the OS install / ev-pulse) after verifying all rebuild deps have 3.14 wheels and import
  cleanly: `anthropic` 0.104, `mcp`, `lancedb` 0.30, `fastembed` 0.8. No fallback needed.
- **uv** for environment + dependency management; **ruff** (line-length 88, rules E/F/W/I);
  **pytest** with `unit` / `contract` / `integration` markers.

## 6. Security

- The upstream `wolfgang` branch committed a live-looking OpenAI key in
  `tests/check_quota_limit.py`. That file is **not** carried forward; the key should be
  **revoked** at the OpenAI dashboard regardless.

## 7. Licensing & public release

- Repository licensed **Polyform Noncommercial 1.0.0**; the clean-room rewrite makes this
  clean for the code. The preserved `product/` (custom-GPT config) reflects team joint work
  and is included with credit.
- **Public release of team-derived material requires HP FOWA Team 4 consent** — the repo
  stays private until then (see `NOTICE.md`).

## 8. Hosted chat: PII input gate + UI voice

- **PII is blocked on input.** The hosted chat (`web.py` / `wsgi.py`) rejects a message
  containing an obvious SSN, email, or phone number with a friendly 400
  (`PII_BLOCK_DETAIL` in `safety.py`) *before any model call*, so the UI's privacy copy
  is true by construction. The reply-side check stays a **post-hoc advisory** — under
  streaming, tokens already sent can't be retracted, so blocking there would be theater.
- **UI chrome speaks as the tool, in the owner's register** — short declaratives, plain
  language, no inspirational filler, no tech vocabulary ("agentic", "RAG") in
  student-facing copy. This is a **scoped adaptation** of the first-person-voice rule:
  bio claims and self-descriptors stay on the owner's personal site, never in product
  chrome.
- **Bound copy strings** (single source of truth for audits; the canonical set lives in
  `static/index.html`). Beyond the core table (title, subtitle, greeting, chips,
  placeholder, send, thinking, error, empty-reply, privacy hint), five state-machine
  strings are bound here: PII advisory *"A quick note: leave out personal info like
  emails, phone numbers, or SSNs — Lodestar never needs them."*; truncation note *"That
  answer hit the length limit and may be cut off — ask a follow-up for the rest."*;
  dropped-stream notice *"The connection dropped before the answer finished."*;
  scroll pill *"Jump to latest"*; retry button *"Try again"*.
