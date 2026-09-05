import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createApiKeySchema, updateApiKeySchema } from "@openmiq/shared";
import { users, type Db } from "@openmiq/db";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { requireSession } from "../middleware/session.ts";
import { peek } from "../lib/rateLimiter.ts";
import {
  createApiKey,
  listApiKeys,
  updateApiKey,
  regenerateApiKey,
  deleteApiKey,
  deleteAllApiKeys,
  findApiKeyForUser,
} from "../services/apiKeyService.ts";
import type { SessionIdentity } from "../services/sessionService.ts";

type Variables = { identity: SessionIdentity | null };

async function requireApprovedUserId(
  db: Db,
  identity: SessionIdentity,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.discordId, identity.discordId))
    .limit(1);
  const user = rows[0];
  if (!user || user.status !== "approved") return null;
  return user.id;
}

function keySummary(
  env: Env,
  db: Db,
  key: Awaited<ReturnType<typeof listApiKeys>>[number],
) {
  const usage = peek(
    db,
    `apikey:${key.id}`,
    env.RATE_LIMIT_WINDOW_MS,
    env.RATE_LIMIT_MAX,
  );
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
    requestCount: key.requestCount,
    createdAt: key.createdAt,
    limit: usage.limit,
    remaining: usage.remaining,
    resetAt: usage.resetAt,
  };
}

export function createApiKeysConsoleApp(env: Env) {
  const app = new Hono<{ Variables: Variables }>();
  const db = getDb(env);

  app.get("/api/console/api-keys", requireSession(), async (c) => {
    const identity = c.get("identity")!;
    const userId = await requireApprovedUserId(db, identity);
    if (!userId) return c.json({ error: "forbidden" }, 403);
    const keys = await listApiKeys(db, userId);
    return c.json(keys.map((key) => keySummary(env, db, key)));
  });

  app.post("/api/console/api-keys", requireSession(), async (c) => {
    const identity = c.get("identity")!;
    const userId = await requireApprovedUserId(db, identity);
    if (!userId) return c.json({ error: "forbidden" }, 403);

    const body = await c.req.json().catch(() => null);
    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "invalid_request", issues: parsed.error.issues },
        400,
      );
    }

    const result = await createApiKey(
      db,
      userId,
      parsed.data,
      env.MAX_API_KEYS_PER_USER,
    );
    if (result === "limit_reached") {
      return c.json({ error: "limit_reached" }, 409);
    }
    return c.json(result, 201);
  });

  app.patch("/api/console/api-keys/:id", requireSession(), async (c) => {
    const identity = c.get("identity")!;
    const userId = await requireApprovedUserId(db, identity);
    if (!userId) return c.json({ error: "forbidden" }, 403);

    const body = await c.req.json().catch(() => null);
    const parsed = updateApiKeySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "invalid_request", issues: parsed.error.issues },
        400,
      );
    }
    const ok = await updateApiKey(db, c.req.param("id"), userId, parsed.data);
    if (!ok) return c.json({ error: "not_found" }, 404);
    return c.json({ status: "updated" });
  });

  app.post(
    "/api/console/api-keys/:id/regenerate",
    requireSession(),
    async (c) => {
      const identity = c.get("identity")!;
      const userId = await requireApprovedUserId(db, identity);
      if (!userId) return c.json({ error: "forbidden" }, 403);

      const plaintext = await regenerateApiKey(db, c.req.param("id"), userId);
      if (!plaintext) return c.json({ error: "not_found" }, 404);
      return c.json({ plaintext });
    },
  );

  app.delete("/api/console/api-keys/:id", requireSession(), async (c) => {
    const identity = c.get("identity")!;
    const userId = await requireApprovedUserId(db, identity);
    if (!userId) return c.json({ error: "forbidden" }, 403);

    const ok = await deleteApiKey(db, c.req.param("id"), userId);
    if (!ok) return c.json({ error: "not_found" }, 404);
    return c.body(null, 204);
  });

  app.delete("/api/console/api-keys", requireSession(), async (c) => {
    const identity = c.get("identity")!;
    const userId = await requireApprovedUserId(db, identity);
    if (!userId) return c.json({ error: "forbidden" }, 403);

    await deleteAllApiKeys(db, userId);
    return c.body(null, 204);
  });

  app.get("/api/console/api-keys/:id/usage", requireSession(), async (c) => {
    const identity = c.get("identity")!;
    const userId = await requireApprovedUserId(db, identity);
    if (!userId) return c.json({ error: "forbidden" }, 403);

    const key = await findApiKeyForUser(db, c.req.param("id"), userId);
    if (!key) return c.json({ error: "not_found" }, 404);
    return c.json(keySummary(env, db, key));
  });

  return app;
}
