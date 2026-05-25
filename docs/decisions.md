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
