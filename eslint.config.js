// Lint: ESLint's recommended rules, typescript-eslint's, and React's rules of hooks. Types are checked by tsc
// (npm run typecheck); this catches what the compiler doesn't: unused code, hooks called conditionally, effects
// missing a dependency.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "public/", "data/", "dry-run/", "coverage/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // The code uses comma sequences as compact statements on purpose ("swap(i, j), s++"); the rule flags them all.
      "@typescript-eslint/no-unused-expressions": "off",
      // A leading underscore marks a value left unused on purpose (a skipped tuple slot, a callback's first argument).
      // let [a, b] = …; with only some of them reassigned stays a let.
      "prefer-const": ["error", { destructuring: "all" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  // Tests poke at loosely typed data (rendered presets, exam answers).
  { files: ["tests/**"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
);
