import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { identifyApiKey, AUTH_ERROR_STATUS } from "../middleware/apiKeyAuth.ts";
import { peek } from "../lib/rateLimiter.ts";

const usageResultSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  resetAt: z.string(),
  requestCount: z.number(),
  lastUsedAt: z.string().nullable(),
});
const authErrorSchema = z.object({ error: z.string() });

export function createUsageApp(env: Env) {
  const app = new OpenAPIHono();
  const db = getDb(env);

  // Documentation only, like quote.ts — the handler below is untouched.
  app.openAPIRegistry.registerPath(
    createRoute({
      method: "get",
      path: "/api/usage",
      summary: "Check the current rate-limit window for an API key",
      description:
        "Does not itself consume a request from the rate-limit window.",
      security: [{ ApiKeyAuth: [] }],
      responses: {
        200: {
          description: "The current usage summary",
          content: { "application/json": { schema: usageResultSchema } },
        },
        401: {
          description: "Missing, invalid, revoked or expired API key",
          content: { "application/json": { schema: authErrorSchema } },
        },
        403: {
          description: "Account not approved, or reconsent required",
          content: { "application/json": { schema: authErrorSchema } },
        },
      },
    }),
  );

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
