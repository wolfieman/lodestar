# Restore Runbook — Cloudflare State

How to rebuild the hosted deploy (lodestar.sanyer.org) after data loss, from a
wiped Vectorize index up to a from-zero Cloudflare account. The headline: **every
byte of server-side state is derived from this repo.** The Vectorize index is
re-seedable from `data/knowledge.json` in one command, no chat logs exist by
design, and KV holds only self-expiring counters — so "restore" is always
"redeploy + re-seed", never "recover data".

## What is stateful (and what is not)

| Store | Contents | Backup needed? |
|---|---|---|
| Vectorize index `lodestar-kb` | One 384-dim cosine vector per KB snippet + `{title, category}` metadata, keyed by snippet id | **No — fully derived.** `worker/scripts/seed-vectorize.mjs` embeds `${title}. ${content}` for each entry of `data/knowledge.json` (tracked in git) via Workers AI `@cf/baai/bge-small-en-v1.5` and upserts by id. Snippet **text** never lives in Vectorize: the Worker bundles `knowledge.json` at build time and maps match ids back through that in-memory table (`worker/src/retrieval.ts`), so the index stores rankings, not content. |
| KV `BUDGET_KV` | Daily live-request counters, one key per UTC day, 2-day TTL | No — ephemeral by design; restore means recreating the (empty) namespace. |
| `RATE_LIMITER` | Per-colo in-memory counters | No — declarative config in `wrangler.jsonc`; nothing persists. |
| Workers AI / `AI` binding | Stateless inference | No — an availability dependency, not state. |
| `ASSETS` | `src/lodestar/static/` | No — in git. |
| Chat logs | **None.** Single user turn, stateless per request (`worker/src/chat.ts`); conversations are never persisted | Nothing exists to lose. |
| Python standby stack (cPanel) | LanceDB store in a fresh temp dir per process, ingesting the same `data/knowledge.json` | No — rebuilt on boot. |

Out-of-band (NOT in this repo, NOT restorable from git): the `ANTHROPIC_API_KEY`
secret and its **spend cap** (Anthropic console — the cap is the true cost
backstop the code comments rely on), the Cloudflare account + API token, the zone
**WAF rate-limiting rule** on `/api/chat` (see `security.md`), the Workers Builds
git connection, and Namecheap DNS/NS for `sanyer.org`.

## Scenarios

- **S1 — index wiped, corrupted, or stale** (Cloudflare account intact). The
  common case. Retrieval degrades gracefully to BM25-only while the index is
  missing (`worker/src/retrieval.ts`), so this is a quality regression, not an
  outage — restore calmly.
- **S2 — account-level loss** (new Cloudflare account; zone gone).
- **S3 — workstation loss** (rebuild tooling from GitHub on a fresh machine).
- **S4 — KB edit drift / snippet deletions** (orphan-vector cleanup).
- **Non-scenario: chat-history loss.** Impossible — nothing is stored.

## Prerequisites

1. Clone of `https://github.com/wolfieman/lodestar.git`, current with
   `origin/main`.
2. Node LTS; `cd worker && npm ci`.
3. Cloudflare auth, two forms: `npx wrangler login` (deploy, index/KV creation)
   **and** an API token with **Workers AI:Read + Vectorize:Edit** plus
   `CLOUDFLARE_ACCOUNT_ID` from `npx wrangler whoami` — the seed script speaks
   raw REST, not wrangler auth.
4. Anthropic API key, with the spend cap (re)configured in the Anthropic console.
5. (S2 only) Access to Namecheap DNS for `sanyer.org`.

## Restore steps

Run everything from `worker/` unless noted. Steps are tagged by scenario; skip
the ones that do not apply.

1. **(S2/S3)** Clone the repo; `cd worker && npm ci`.
2. **(S1-full / S2 / S4-clean)** Create the index:

   ```bash
   npx wrangler vectorize create lodestar-kb --dimensions=384 --metric=cosine
   ```

   The spec must be exactly 384-dim **cosine** (bge-small-en-v1.5 parity — see
   `worker/src/types.ts`); a wrong metric creates an index that *works* but
   silently distorts every score. For S1 partial corruption or a routine
   re-seed, skip this step — upsert overwrites by id.
3. **(S2)** Recreate the budget namespace and update the config:

   ```bash
   npx wrangler kv namespace create BUDGET_KV
   ```

   Put the printed id into `kv_namespaces` in `wrangler.jsonc` (commit it — the
   id is not a secret).
4. **(S2)** Re-add the `sanyer.org` zone to the account and point the Namecheap
   nameservers at it, so the `wrangler.jsonc` custom-domain routes can attach.
   Interim service: the cPanel rollback path in `deploy.md` (BM25-only lean
   Python build) keeps the site live while DNS settles.
5. Deploy: `npx wrangler deploy` — binds VECTORIZE/AI/ASSETS/RATE_LIMITER/
   BUDGET_KV and attaches `lodestar.sanyer.org` + `www`.
6. Set the secret: `npx wrangler secret put ANTHROPIC_API_KEY`.
7. Seed the index:

   ```bash
   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… node scripts/seed-vectorize.mjs
   ```

   Expect, in order: `KB: 23 snippets`, `embedded: 23 x 384 dims`, an upsert
   mutation id, `indexed: 23 vectors`, and the sanity-query top-3 line. (23 is
   the current KB size; the script reads whatever `data/knowledge.json` holds.)
8. **(S4)** After any `knowledge.json` edit, re-run step 7. Seeding is
   **upsert-only**: deleting a snippet from the KB leaves an orphan vector in
   the index forever. Orphans are functionally harmless (the Worker drops match
   ids it cannot find in the bundled KB) but waste topK slots. After deletions,
   either remove the orphans —

   ```bash
   npx wrangler vectorize delete-vectors lodestar-kb --ids <removed-id> …
   ```

   — or do a clean recreate (`npx wrangler vectorize delete lodestar-kb`, then
   steps 2 + 7).
9. **(S2)** Re-create the out-of-band guards: the zone WAF rate-limiting rule on
   `/api/chat` (dashboard; see `security.md`) and the Workers Builds git
   connection to this repo (dashboard → the Worker → Builds), which is what
   makes a push to `main` deploy.

## Verification

1. `npx wrangler vectorize info lodestar-kb` — vector count equals the KB size
   and dimensions read 384. KB size from the repo root:
   `uv run python -c "import json; print(len(json.load(open('data/knowledge.json'))))"`.
2. The seed script's built-in sanity query prints the top-3 ids/scores for
   "scholarships for HBCU students". Compare the top-1 id against the golden
   value recorded from the last known-good seed (see gaps below — record it on
   the next seed if missing). Scholarship-category ids on top = sane.
3. Offline suites prove the code path independent of the index: from `worker/`,
   `npx vitest run` and `npx vitest run --config vitest.workers.config.ts`; from
   the repo root, `uv run pytest -m unit`.
4. Live smoke: POST to `https://lodestar.sanyer.org/api/chat` with a KB-grounded
   question (e.g. internships); confirm SSE `delta` events then `done`, with an
   answer citing KB content.
5. Dense-path proof — BM25 fallback can mask a dead index, so during the smoke
   test run `npx wrangler tail` and confirm **no** `vector retrieve failed;
   degrading to sparse` or `empty embedding` lines.
6. Optional quality gate: run `evals/runner.py` live (`TEST_MODE=false`) and
   compare scores against prior tracked runs in `evals/runs/`.

## Known gaps

- **No golden sanity-query record yet.** Verification step 2 compares against a
  value nobody has written down. Record the top-1 id/score on the next
  known-good seed (here, or next to the eval runs).
- **Embedding model is hardcoded in two places** that must move in lockstep:
  `worker/src/retrieval.ts` (query side) and `worker/scripts/seed-vectorize.mjs`
  (seed side). If Cloudflare ever retires `@cf/baai/bge-small-en-v1.5`, change
  both **and re-seed** — an index mixing models returns silently wrong rankings.
- **Secrets have no escrow.** The Anthropic key (+ spend cap setting) and the
  Cloudflare token exist only in their consoles; losing console access is its
  own recovery problem, outside this runbook.
- **`worker/.dev.vars` is gitignored** and trivial, but undocumented: it sets
  `TEST_MODE=true` for local `wrangler dev`.
- **`_staging/` is gitignored and unrecoverable** (prompt-extraction captures of
  the original IgniteAI GPT). Irrelevant to the index — but it is the only
  material in this project a machine loss actually destroys.
