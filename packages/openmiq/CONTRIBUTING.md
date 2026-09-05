# Contributing

This package lives inside the [OpenMiQ-API](https://github.com/otnc/OpenMiQ-API) monorepo, under `packages/openmiq`, but is linted, tested and published independently of the rest of it.

```bash
cd packages/openmiq
pnpm install       # from the repo root, or here — pnpm workspaces resolve either way
pnpm run check     # biome check --write
pnpm run typecheck # tsc --noEmit
pnpm run test      # vitest run
pnpm run build     # tsdown — emits dist/index.{mjs,cjs} + .d.mts/.d.cts
```

- Lint/format is [Biome](https://biomejs.dev/), not the ESLint/Prettier setup the rest of the monorepo uses — `pnpm run check`/`pnpm run ci` here, not the root `pnpm run lint`.
- Coding style follows [`@makeitaquote/voids`](https://github.com/otnc/makeitaquote-voids) and [`@makeitaquote/miqx`](https://github.com/otnc/makeitaquote-miqx): a single Fluent-builder class, per-field `normalize*()` validators shared between setters and `setFromObject()`, a version-specific `v1.ts` isolating the actual request/response wire format from `client.ts`.
- Every export from `@makeitaquote/utils` this package can reuse (HTTP client, error base classes, validation helpers, Discord/Misskey/Twitter text handling) should be reused rather than reimplemented — see its subpath exports (`/http`, `/errors`, `/validation`, `/discord`, `/mfm`, `/twitter`, `/markdown`).
- `.github/workflows/openmiq-ci.yml` and `openmiq-release.yml` live at the **repo root** (GitHub Actions only reads `.github/workflows/` there, not in subdirectories), scoped to `packages/openmiq/**` via `paths` filters.
