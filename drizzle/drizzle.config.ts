import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "packages/db/src/schema.ts",
  out: "drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:data/db.sqlite",
  },
});
