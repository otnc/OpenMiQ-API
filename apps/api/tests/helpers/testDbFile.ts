import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../drizzle/migrations",
);

// Route-level tests go through `getDb(env)`, which opens its own connection
// from `env.DATABASE_URL` — so, unlike packages/db/src/testDb.ts's in-memory
// helper, this needs a real file: migrations are applied here, then the same
// path is handed to the app under test as DATABASE_URL, and getDb's own
// `new Database(path)` sees the already-migrated schema.
export function createTestDbFile(): { url: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "openmiq-api-test-"));
  const path = join(dir, "test.sqlite");
  const sqlite = new Database(path);
  migrate(drizzle(sqlite), { migrationsFolder });
  sqlite.close();
  return {
    url: `file:${path}`,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
