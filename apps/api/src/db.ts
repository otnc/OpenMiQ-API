import { createDb } from "@openmiq-api/db";
import type { Env } from "./config/env.ts";

let db: ReturnType<typeof createDb> | undefined;

export function getDb(env: Env) {
  db ??= createDb(env.DATABASE_URL);
  return db;
}
