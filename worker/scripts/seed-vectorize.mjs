// Seed the `lodestar-kb` Vectorize index from data/knowledge.json.
//
// Embeds each snippet as `${title}. ${content}` — the EXACT document text the
// Python stack embeds (retrieval/knowledge.py ingest) — using Workers AI's
// bge-small-en-v1.5 (the same model fastembed runs locally), then upserts the
// 384-dim vectors by snippet id. Queries later embed raw (also Python parity).
//
// One-off / re-runnable (upsert overwrites by id). Run after any KB edit:
//
//   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/seed-vectorize.mjs
//
// Token permissions needed: Workers AI:Read, Vectorize:Edit.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL = "@cf/baai/bge-small-en-v1.5";
const INDEX = "lodestar-kb";

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) {
  console.error("Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID (see wrangler whoami).");
  process.exit(1);
}

const API = `https://api.cloudflare.com/client/v4/accounts/${account}`;
const HEADERS = { authorization: `Bearer ${token}` };

const here = dirname(fileURLToPath(import.meta.url));
const snippets = JSON.parse(
  readFileSync(join(here, "..", "..", "data", "knowledge.json"), "utf-8"),
);
console.log(`KB: ${snippets.length} snippets`);

// 1. Embed all documents in one batch (knowledge.py ingest text shape).
const texts = snippets.map((s) => `${s.title}. ${s.content}`);
const embedRes = await fetch(`${API}/ai/run/${MODEL}`, {
  method: "POST",
  headers: { ...HEADERS, "content-type": "application/json" },
  body: JSON.stringify({ text: texts }),
});
const embedBody = await embedRes.json();
if (!embedRes.ok || !embedBody.success) {
  console.error("embedding failed:", JSON.stringify(embedBody.errors ?? embedBody));
  process.exit(1);
}
const vectors = embedBody.result.data;
console.log(`embedded: ${vectors.length} x ${vectors[0].length} dims`);

// 2. Upsert as NDJSON (Vectorize v2).
const ndjson = snippets
  .map((s, i) =>
    JSON.stringify({
      id: s.id,
      values: vectors[i],
      metadata: { title: s.title, category: s.category },
    }),
  )
  .join("\n");
const upsertRes = await fetch(`${API}/vectorize/v2/indexes/${INDEX}/upsert`, {
  method: "POST",
  headers: { ...HEADERS, "content-type": "application/x-ndjson" },
  body: ndjson,
});
const upsertBody = await upsertRes.json();
if (!upsertRes.ok || !upsertBody.success) {
  console.error("upsert failed:", JSON.stringify(upsertBody.errors ?? upsertBody));
  process.exit(1);
}
console.log(`upserted; mutation ${upsertBody.result.mutationId}`);

// 3. Poll until the mutation is indexed (async), then sanity-query.
for (let i = 0; i < 30; i += 1) {
  const infoRes = await fetch(`${API}/vectorize/v2/indexes/${INDEX}/info`, {
    headers: HEADERS,
  });
  const info = (await infoRes.json()).result;
  if (info && info.vector_count >= snippets.length) {
    console.log(`indexed: ${info.vector_count} vectors`);
    break;
  }
  await new Promise((r) => setTimeout(r, 3000));
}

const probeRes = await fetch(`${API}/ai/run/${MODEL}`, {
  method: "POST",
  headers: { ...HEADERS, "content-type": "application/json" },
  body: JSON.stringify({ text: ["scholarships for HBCU students"] }),
});
const probeVec = (await probeRes.json()).result.data[0];
const queryRes = await fetch(`${API}/vectorize/v2/indexes/${INDEX}/query`, {
  method: "POST",
  headers: { ...HEADERS, "content-type": "application/json" },
  body: JSON.stringify({ vector: probeVec, topK: 3, returnMetadata: "indexed" }),
});
const matches = (await queryRes.json()).result?.matches ?? [];
console.log(
  "sanity query 'scholarships for HBCU students' ->",
  matches.map((m) => `${m.id} (${m.score.toFixed(3)})`).join(", ") ||
    "(no matches yet — indexing may still be in progress)",
);
