# Deploying the Lodestar Web UI

`src/lodestar/web.py` is a FastAPI app: `GET /` serves a single-page chat, `POST /api/chat`
runs the agent, `GET /health` is a probe. The repo ships a [`Dockerfile`](../Dockerfile) so
any container host works.

## Run locally

```bash
uv sync                       # fastapi + uvicorn are runtime deps
uv run lodestar-web           # http://127.0.0.1:8000  (offline mock by default)
# live Claude:
ANTHROPIC_API_KEY=sk-ant-... TEST_MODE=false uv run lodestar-web
```

## Run with Docker

```bash
docker build -t lodestar .
docker run -p 8000:8000 -e TEST_MODE=true lodestar                 # offline demo
docker run -p 8000:8000 -e TEST_MODE=false -e ANTHROPIC_API_KEY=sk-ant-... lodestar  # live
```

## Deploy to a host

All three read the `Dockerfile` and inject `$PORT` automatically.

**Railway** — `railway init` → `railway up`; set env vars `ANTHROPIC_API_KEY` and
`TEST_MODE=false` in the dashboard.

**Fly.io** — `fly launch` (detects the Dockerfile) → `fly secrets set ANTHROPIC_API_KEY=…
TEST_MODE=false` → `fly deploy`.

**Render** — New → Web Service → connect the repo → Docker runtime → add the two env vars.

### Notes
- **Offline-safe:** with `TEST_MODE=true` the app runs with no API key (mock model + BM25/hash
  retrieval) — good for a zero-cost public demo.
- **Live mode:** set `ANTHROPIC_API_KEY` + `TEST_MODE=false`. On first request the embedding
  model downloads from HuggingFace (cloud hosts can reach it); if not, retrieval falls back to
  BM25 automatically.
- **Cost control:** consider basic rate limiting / an allowlist before exposing a live-key demo
  publicly (documented as a hardening step in `security.md`).
