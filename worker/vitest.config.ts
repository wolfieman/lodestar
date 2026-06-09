// Default-environment suites (Node): the pure-module unit tests (bm25, safety)
// AND the chat-pipeline tests (chat.test.ts), which call the Worker's exported
// fetch handler directly with a stub Env. None of these import workerd runtime
// APIs, so they need no Miniflare. JSON imports (data/knowledge.json, fixtures)
// and .txt imports are handled by the inline-string transform below.
//
// The SELF.fetch integration suite runs separately under
// @cloudflare/vitest-pool-workers via vitest.workers.config.ts (file glob
// *.workers.test.ts), kept a separate config for workerd runtime fidelity; it is
// EXCLUDED here. Both configs run on Node 24 (pool 0.16 + vitest 4).
import { readFileSync } from "node:fs";

import { defineConfig } from "vitest/config";

// Inline *.txt imports as default-exported strings, mirroring the wrangler Text
// rule (wrangler.jsonc) at test time so prompt.ts resolves system-prompt.txt /
// context-preamble.txt under plain vitest/esbuild. We intercept at `load` (with
// `enforce: "pre"` so we beat Vite's default asset handling, which would
// otherwise resolve a .txt import to a URL string) and read the raw bytes from
// disk — byte-identical to what the wrangler Text rule inlines at build time.
const txtAsString = {
  name: "txt-as-string",
  enforce: "pre" as const,
  load(id: string) {
    const path = id.split("?")[0];
    if (!path.endsWith(".txt")) return null;
    const content = readFileSync(path, "utf8");
    return `export default ${JSON.stringify(content)};`;
  },
};

export default defineConfig({
  plugins: [txtAsString],
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/**/*.workers.test.ts", "**/node_modules/**"],
  },
});
