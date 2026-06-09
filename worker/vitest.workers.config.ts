import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

// Integration suite that exercises the Worker via SELF.fetch inside workerd
// (Miniflare) for runtime fidelity. Run with:
//   npx vitest run --config vitest.workers.config.ts
//
// Runs on Node 24: the @cloudflare/vitest-pool-workers 0.16 / vitest 4 toolchain
// is Node-24-native. (The older 0.9 pool crashed on Node 24 with
// `vm._setUnsafeEval is not a function`, which is why this used to be pinned to
// Node 22; that workaround is gone.)
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        // Offline: the integration tests use the TEST_MODE mock (no key/network).
        bindings: { TEST_MODE: "true" },
      },
    }),
  ],
  test: {
    include: ["test/**/*.workers.test.ts"],
  },
});
