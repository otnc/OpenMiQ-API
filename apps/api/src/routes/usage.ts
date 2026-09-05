import { Hono } from "hono";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { identifyApiKey } from "../middleware/apiKeyAuth.ts";
import { peek } from "../lib/rateLimiter.ts";

export function createUsageApp(env: Env) {
  const app = new Hono();
  const db = getDb(env);

  app.get("/api/usage", async (c) => {
    const result = await identifyApiKey(db, c.req.header("X-API-Key"));
    if ("error" in result) {
      const status = result.error === "account_not_approved" ? 403 : 401;
      return c.json({ error: result.error }, status);
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
