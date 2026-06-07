import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

// Integration suite that exercises the Worker via SELF.fetch inside workerd
// (Miniflare) for runtime fidelity — used for chat.test.ts (later Phase 2 step:
// the request pipeline). Run with:  npx vitest run --config vitest.workers.config.ts
//
// NOTE: @cloudflare/vitest-pool-workers crashes on Node 24
// (`vm._setUnsafeEval is not a function`); run this suite on Node 22 LTS,
// matching the CI `worker` job's pinned Node version.
export default defineWorkersConfig({
  test: {
    include: ["test/**/*.workers.test.ts"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          // Offline: the integration tests use the TEST_MODE mock (no key/network).
          bindings: { TEST_MODE: "true" },
        },
      },
    },
  },
});
