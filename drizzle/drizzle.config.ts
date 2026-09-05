import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// DATABASE_URL's `file:` path is relative to apps/api (that's where the
// running server's own cwd is — pm2, `pnpm run dev`/`start` all set it), but
// `drizzle-kit` here always runs from the repo root. Resolving against
// apps/api explicitly keeps `pnpm run db:migrate` pointed at the exact file
// apps/api itself opens, regardless of drizzle-kit's own cwd.
const raw = process.env.DATABASE_URL ?? "file:./data/db.sqlite";
const relativePath = raw.startsWith("file:") ? raw.slice("file:".length) : raw;
const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/api");

export default defineConfig({
  dialect: "sqlite",
  schema: "packages/db/src/schema.ts",
  out: "drizzle/migrations",
  dbCredentials: {
    url: resolve(apiDir, relativePath),
  },
});
