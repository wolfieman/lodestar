# Lodestar web UI — container image
# Build:  docker build -t lodestar .
# Run:    docker run -p 8000:8000 -e TEST_MODE=true lodestar
# Live:   docker run -p 8000:8000 -e TEST_MODE=false -e ANTHROPIC_API_KEY=sk-ant-... lodestar
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim

WORKDIR /app
COPY . .

# Reproducible install from the lockfile, runtime deps only
RUN uv sync --frozen --no-dev

# Offline mock by default; set TEST_MODE=false + ANTHROPIC_API_KEY for live Claude
ENV TEST_MODE=true \
    PORT=8000
EXPOSE 8000

CMD uv run uvicorn lodestar.web:app --host 0.0.0.0 --port ${PORT:-8000}
