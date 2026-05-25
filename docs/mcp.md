# Lodestar as an MCP Server

Lodestar is exposed over the **Model Context Protocol** so it plugs into Claude Desktop
(and any MCP client) as a set of tools. Implementation: `src/lodestar/mcp_server.py`
(built on the `mcp` SDK's `FastMCP`).

## Tools exposed

| Tool | What it does |
|---|---|
| `retrieve_knowledge(query)` | Hybrid (BM25 + vector) search of the HBCU career knowledge base; returns the most relevant entries. No model call. |
| `get_career_advice(question)` | A grounded Lodestar answer (retrieval + the configured LLM, Claude by default). |

## Run it

```bash
cd /c/projects/lodestar
uv run python -m lodestar.mcp_server      # stdio transport; Ctrl-C to stop
```

## Wire it into Claude Desktop

Add to your `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "ignite-ai": {
      "command": "uv",
      "args": ["--directory", "C:/projects/lodestar", "run", "python", "-m", "lodestar.mcp_server"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "TEST_MODE": "false"
      }
    }
  }
}
```

Restart Claude Desktop; Lodestar's tools then appear in the client. With `TEST_MODE=true`
the server runs fully offline (mock answers + hash-embedding retrieval) for wiring tests.

## Inspect/debug

Use the MCP inspector to exercise the tools without a full client:

```bash
npx @modelcontextprotocol/inspector uv run python -m lodestar.mcp_server
```
