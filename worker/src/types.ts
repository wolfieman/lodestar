// Shared types for the Lodestar Worker.

/** A single knowledge-base entry (mirrors lodestar.retrieval.base.Snippet). */
export interface Snippet {
  id: string;
  category: string;
  title: string;
  content: string;
}

/** Cloudflare rate-limit binding surface (GA top-level `ratelimits` config). */
export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Static-assets binding surface (wrangler.jsonc `assets.binding`). */
export interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

/** Workers AI binding surface (used for bge-small-en-v1.5 embeddings only). */
export interface AiBinding {
  run(model: string, inputs: { text: string[] }): Promise<{ data: number[][] }>;
}

/** Vectorize index binding surface (query only; seeding is a REST-side script). */
export interface VectorizeBinding {
  query(
    vector: number[],
    options: { topK: number },
  ): Promise<{ matches: { id: string; score: number }[] }>;
}

/** Worker environment bindings and vars (see wrangler.jsonc + .dev.vars). */
export interface Env {
  /** Secret; only present (and only used) when TEST_MODE is falsy. */
  ANTHROPIC_API_KEY?: string;
  /** Truthy set {"1","true","yes","on"} (config.py:13-18 parity). */
  TEST_MODE: string;
  /** Dated model id, e.g. "claude-haiku-4-5-20251001". */
  LODESTAR_MODEL: string;
  /** Stringified int, "1024" by default (anthropic.py complete() default). */
  MAX_TOKENS: string;
  /** Per-IP rate limiter bound via the GA `ratelimits` config. */
  RATE_LIMITER: RateLimit;
  /** Static assets; used to serve Flask-scheme /static/* paths (index.ts). */
  ASSETS: AssetsFetcher;
  /** Workers AI — same embedding model as the Python stack's fastembed. */
  AI: AiBinding;
  /** Vectorize index `lodestar-kb` (384-dim cosine, seeded from the KB). */
  VECTORIZE: VectorizeBinding;
}
