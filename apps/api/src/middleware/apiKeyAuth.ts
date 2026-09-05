import { eq, sql } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { apiKeys, users, type Db } from "@openmiq/db";
import type { Env } from "../config/env.ts";
import { hashApiKey } from "../lib/apiKeyCrypto.ts";
import { checkAndIncrement } from "../lib/rateLimiter.ts";

export interface AuthedApiKey {
  id: string;
  userId: string;
  requestCount: number;
}

type AuthError =
  | "missing_api_key"
  | "invalid_api_key"
  | "revoked_api_key"
  | "expired_api_key"
  | "account_not_approved"
  | "reconsent_required";

export const AUTH_ERROR_STATUS: Record<AuthError, 401 | 403> = {
  missing_api_key: 401,
  invalid_api_key: 401,
  revoked_api_key: 401,
  expired_api_key: 401,
  account_not_approved: 403,
  reconsent_required: 403,
};

// Identifies the API key without touching the rate-limit counter, for
// endpoints like GET /api/usage that must not themselves count as a
// consumed request (DESIGN.md §5.4).
export async function identifyApiKey(
  db: Db,
  env: Pick<Env, "TERMS_VERSION" | "PRIVACY_VERSION">,
  provided: string | undefined,
): Promise<{ key: typeof apiKeys.$inferSelect } | { error: AuthError }> {
  if (!provided) return { error: "missing_api_key" };

  const hash = hashApiKey(provided);
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);
  const key = rows[0];
  if (!key) return { error: "invalid_api_key" };
  if (key.revokedAt) return { error: "revoked_api_key" };
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
    return { error: "expired_api_key" };
  }

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, key.userId))
    .limit(1);
  const user = userRows[0];
  if (!user || user.status !== "approved") {
    return { error: "account_not_approved" };
  }

  // A version mismatch freezes the key without touching USER.status: no
  // admin action, no cooldown, no re-application — just re-agree via
  // POST /api/console/consent to unfreeze immediately (DESIGN.md §16.4).
  if (
    user.agreedTermsVersion !== env.TERMS_VERSION ||
    user.agreedPrivacyVersion !== env.PRIVACY_VERSION
  ) {
    return { error: "reconsent_required" };
  }

  return { key };
}

type Variables = { apiKey: AuthedApiKey };

// Full authentication used by the billable/rate-limited endpoints (e.g.
// POST /api/quote): identifies the key, consumes one request from its
// rate-limit window, and records usage.
export function apiKeyAuthMiddleware(env: Env, db: Db) {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const result = await identifyApiKey(db, env, c.req.header("X-API-Key"));
    if ("error" in result) {
      return c.json({ error: result.error }, AUTH_ERROR_STATUS[result.error]);
    }
    const { key } = result;

    const rateLimit = checkAndIncrement(
      db,
      `apikey:${key.id}`,
      env.RATE_LIMIT_WINDOW_MS,
      env.RATE_LIMIT_MAX,
    );
    c.header("RateLimit-Limit", String(rateLimit.limit));
    c.header("RateLimit-Remaining", String(rateLimit.remaining));
    c.header("RateLimit-Reset", rateLimit.resetAt.toISOString());
    if (!rateLimit.allowed) {
      return c.json({ error: "rate_limited" }, 429);
    }

    await db
      .update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        requestCount: sql`${apiKeys.requestCount} + 1`,
      })
      .where(eq(apiKeys.id, key.id));

    c.set("apiKey", {
      id: key.id,
      userId: key.userId,
      requestCount: key.requestCount + 1,
    });
    await next();
  });
}
