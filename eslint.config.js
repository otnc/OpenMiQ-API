import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "build/",
      ".svelte-kit/",
      "coverage/",
      "node_modules/",
      "data/",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs["flat/recommended"],
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: { parser: svelteParser },
  },
  {
    files: ["ecosystem.config.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  prettier,
  ...svelte.configs["flat/prettier"],
);
