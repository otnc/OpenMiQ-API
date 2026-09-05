import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import webSvelteConfig from "./apps/web/svelte.config.js";

export default tseslint.config(
  {
    ignores: [
      "**/dist/",
      "**/build/",
      "**/.svelte-kit/",
      "**/coverage/",
      "**/node_modules/",
      "**/data/",
      // Lints/formats with its own Biome setup instead (see DESIGN.md §15.2)
      // — the small npm-published packages follow the sibling packages'
      // convention, distinct from the ESLint/Prettier setup the apps use.
      "packages/openmiq/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // apps/web code runs in the browser as well as on the SvelteKit server,
    // so it needs DOM globals (HTMLDivElement, FileList, ...) on top of the
    // Node globals already set above.
    files: ["apps/web/**/*"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["apps/web/**/*.svelte"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        // Lets svelte-eslint-parser hand a <script lang="ts"> block's
        // contents to the TS parser instead of parsing it as plain JS —
        // required for type annotations like `let { data }: Props = $props()`
        // (see eslint-plugin-svelte's TypeScript setup docs).
        parser: tseslint.parser,
        // Passing the real svelte.config.js gives the parser/rules the same
        // preprocessors and kit aliases ($lib, etc.) the app itself uses.
        svelteConfig: webSvelteConfig,
      },
    },
    rules: {
      // We're not adopting SvelteKit's typed-routes `resolve()` helper yet —
      // plain string hrefs are still the norm across this app.
      "svelte/no-navigation-without-resolve": "off",
    },
  },
  {
    files: ["ecosystem.config.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  prettier,
  ...svelte.configs.prettier,
);
