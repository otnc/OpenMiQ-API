import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { apiKeys, users } from "@openmiq/db";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { requireSession } from "../middleware/session.ts";
import { requireAdmin } from "../middleware/admin.ts";
import { peek } from "../lib/rateLimiter.ts";
import {
  revokeApiKeyAsAdmin,
  deleteApiKeyAsAdmin,
  deleteAllApiKeysAsAdmin,
} from "../services/apiKeyService.ts";
import type { SessionIdentity } from "../services/sessionService.ts";

type Variables = { identity: SessionIdentity | null };

export function createApiKeysAdminApp(env: Env) {
  const app = new Hono<{ Variables: Variables }>();
  const db = getDb(env);

  app.use("/api/admin/*", requireSession(), requireAdmin(env));

  app.get("/api/admin/api-keys", async (c) => {
    const userId = c.req.query("userId");
    const rows = userId
      ? await db.select().from(apiKeys).where(eq(apiKeys.userId, userId))
      : await db.select().from(apiKeys);
    return c.json(
      rows.map((key) => {
        const usage = peek(
          db,
          `apikey:${key.id}`,
          env.RATE_LIMIT_WINDOW_MS,
          env.RATE_LIMIT_MAX,
        );
        return {
          ...key,
          limit: usage.limit,
          remaining: usage.remaining,
          resetAt: usage.resetAt,
        };
      }),
    );
  });

  app.get("/api/admin/api-keys/:id/usage", async (c) => {
    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, c.req.param("id")))
      .limit(1);
    const key = rows[0];
    if (!key) return c.json({ error: "not_found" }, 404);
    const usage = peek(
      db,
      `apikey:${key.id}`,
      env.RATE_LIMIT_WINDOW_MS,
      env.RATE_LIMIT_MAX,
    );
    return c.json({
      ...key,
      limit: usage.limit,
      remaining: usage.remaining,
      resetAt: usage.resetAt,
    });
  });

  app.post("/api/admin/api-keys/:id/revoke", async (c) => {
    const identity = c.get("identity")!;
    const ok = await revokeApiKeyAsAdmin(
      db,
      c.req.param("id"),
      identity.discordId,
    );
    if (!ok) return c.json({ error: "not_found" }, 404);
    return c.json({ status: "revoked" });
  });

  app.delete("/api/admin/api-keys/:id", async (c) => {
    await deleteApiKeyAsAdmin(db, c.req.param("id"));
    return c.body(null, 204);
  });

  app.delete("/api/admin/api-keys", async (c) => {
    const userId = c.req.query("userId");
    if (!userId) return c.json({ error: "userId_required" }, 400);
    await deleteAllApiKeysAsAdmin(db, userId);
    return c.body(null, 204);
  });

  app.patch("/api/admin/users/:id", async (c) => {
    const body = await c.req.json().catch(() => null);
    const maxApiKeys = body?.maxApiKeys;
    if (maxApiKeys !== null && typeof maxApiKeys !== "number") {
      return c.json({ error: "invalid_request" }, 400);
    }
    await db
      .update(users)
      .set({ maxApiKeys })
      .where(eq(users.id, c.req.param("id")));
    return c.json({ status: "updated" });
  });

  return app;
}
