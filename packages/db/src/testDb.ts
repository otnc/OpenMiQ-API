import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.ts";
import type { Db } from "./client.ts";

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../drizzle/migrations",
);

// A fresh in-memory database with the real migrations applied, for tests
// that need actual SQL semantics (constraints, transactions) rather than
// mocking the ORM.
export function createTestDb(): Db {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db;
}
