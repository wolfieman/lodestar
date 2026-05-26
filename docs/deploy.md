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
- **Cost control:** the app rate-limits per IP (`RATE_LIMIT_PER_MIN`, default 12) and caps
  message length; a live-key public demo should also have a **spend limit** set in the provider
  console (documented as a hardening step in `security.md`).

## Deploy to Namecheap cPanel (shared hosting)

cPanel runs Python apps over WSGI via Phusion Passenger ("Setup Python App"). Lodestar's ASGI
app is wrapped by [`passenger_wsgi.py`](../passenger_wsgi.py) (via `a2wsgi`). Use the **lean**
dependency set ([`requirements-lean.txt`](../requirements-lean.txt)) — the heavy semantic-RAG
stack (`lancedb`/`fastembed`/`onnxruntime`) is RAM/CPU/inode-hungry for a shared tier, and the
app degrades to BM25 retrieval, which is ample for the small curated knowledge base.

**1. DNS — point the subdomain at the hosting.** Namecheap → Domain List → `sanyer.org` →
**Advanced DNS** → add: `A record` · Host `lodestar` · Value `<account IP>` (shown in cPanel's
"General Information" panel, e.g. `162.0.212.4`) · TTL Automatic.

**2. Create the Python app.** cPanel → **Setup Python App** → **Create Application**:
Python = newest available; Application root = `lodestar.sanyer.org`; Application URL =
`lodestar.sanyer.org`; Startup file = `passenger_wsgi.py`; Entry point = `application`. Note the
`source …/bin/activate` command it prints — that's the app's virtualenv.

**3. Code + deps (SSH or cPanel Git Version Control).** Enable SSH (cPanel → **Manage Shell**),
then from the app root:
```bash
cd ~/lodestar.sanyer.org
git clone https://github.com/wolfieman/lodestar.git .   # public repo
source ~/virtualenv/lodestar.sanyer.org/<ver>/bin/activate
pip install -r requirements-lean.txt
```

**4. Environment variables.** Setup Python App → **Environment variables**: `TEST_MODE=false`,
`ANTHROPIC_API_KEY=sk-ant-…`, `LODESTAR_PROVIDER=anthropic`. Set these in the UI (not a committed
file). Then **Restart**.

**5. Verify.** `curl https://lodestar.sanyer.org/health` → `{"status":"ok"}`; open the URL to chat.

**Optional — try full semantic RAG.** Over SSH: `pip install lancedb fastembed onnxruntime`,
restart, and watch memory. If it runs under the account limits, keep it (auto-used); if it OOMs,
uninstall and the app falls back to BM25. For ~23 docs the quality difference is minor.
