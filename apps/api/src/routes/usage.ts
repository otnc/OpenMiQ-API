import { Hono } from "hono";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { identifyApiKey, AUTH_ERROR_STATUS } from "../middleware/apiKeyAuth.ts";
import { peek } from "../lib/rateLimiter.ts";

export function createUsageApp(env: Env) {
  const app = new Hono();
  const db = getDb(env);

  app.get("/api/usage", async (c) => {
    const result = await identifyApiKey(db, env, c.req.header("X-API-Key"));
    if ("error" in result) {
      return c.json({ error: result.error }, AUTH_ERROR_STATUS[result.error]);
    }

    const usage = peek(
      db,
      `apikey:${result.key.id}`,
      env.RATE_LIMIT_WINDOW_MS,
      env.RATE_LIMIT_MAX,
    );
    return c.json({
      limit: usage.limit,
      remaining: usage.remaining,
      resetAt: usage.resetAt,
      requestCount: result.key.requestCount,
      lastUsedAt: result.key.lastUsedAt,
    });
  });

  return app;
}
