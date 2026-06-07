// Worker fetch entry + routing.
//
// Routes: GET /health -> {"status":"ok"} (wsgi.py:60-62 parity); POST /api/chat
// -> the streaming RAG pipeline in chat.ts; anything else -> 404 JSON. GET / and
// static assets are served at the edge by the assets binding and never invoke
// the Worker (assets-first routing; zero invocation cost).

import { handleChat } from "./chat";
import type { Env } from "./types";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      // Top-level guard: any unexpected throw becomes a generic 500 JSON in the
      // {detail} shape the frontend understands (it never opens the stream until
      // the Anthropic call is accepted, so a throw here is pre-stream).
      try {
        return await handleChat(request, env);
      } catch (err) {
        console.error("unhandled /api/chat error:", err);
        return json(
          { detail: "Something went wrong on our end. Wait a moment and try again." },
          500,
        );
      }
    }

    // /static/* parity: Flask serves the static dir under /static/, while the
    // assets binding serves the same dir at the site root. Rewriting here keeps
    // index.html's /static/... URLs (favicons, fonts) host-agnostic.
    if (request.method === "GET" && url.pathname.startsWith("/static/")) {
      const rewritten = new URL(request.url);
      rewritten.pathname = url.pathname.slice("/static".length);
      return env.ASSETS.fetch(new Request(rewritten.toString(), request));
    }

    return json({ detail: "Not found." }, 404);
  },
};
