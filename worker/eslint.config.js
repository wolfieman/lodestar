// Flat ESLint config for the Cloudflare Worker (TypeScript).
// Linting only: prettier owns formatting, and eslint-config-prettier (last) turns
// off the stylistic rules that would conflict. Type-aware rules are intentionally
// left off for now; the non-type-checked "recommended" set is the right-sized
// baseline, and tsconfig already runs strict with noUnusedLocals/Parameters.
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", ".wrangler/**", "**/*.d.ts"] },
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // Match tsconfig's noUnusedLocals/Parameters convention: a leading underscore
      // marks an intentional throwaway (e.g. `for (const _ of s)`).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
);
