import { Hono } from "hono";
import { applicationSchema } from "@openmiq/shared";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { requireSession } from "../middleware/session.ts";
import { getClientIp } from "../lib/ip.ts";
import { checkAndIncrement } from "../lib/rateLimiter.ts";
import {
  checkCanApply,
  submitApplication,
} from "../services/applicationService.ts";
import type { SessionIdentity } from "../services/sessionService.ts";

type Variables = { identity: SessionIdentity | null };

const APPLICATION_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const APPLICATION_RATE_LIMIT_MAX = 3;

export function createApplicationsApp(env: Env) {
  const app = new Hono<{ Variables: Variables }>();
  const db = getDb(env);

  app.post("/api/console/applications", requireSession(), async (c) => {
    const identity = c.get("identity");
    if (!identity) return c.json({ error: "unauthorized" }, 401);

    const ip = getClientIp(c);
    const rateLimit = checkAndIncrement(
      db,
      `applications:${identity.discordId}`,
      APPLICATION_RATE_LIMIT_WINDOW_MS,
      APPLICATION_RATE_LIMIT_MAX,
    );
    if (!rateLimit.allowed) {
      return c.json({ error: "rate_limited", resetAt: rateLimit.resetAt }, 429);
    }

    const body = await c.req.json().catch(() => null);
    const parsed = applicationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "invalid_request", issues: parsed.error.issues },
        400,
      );
    }
    const input = parsed.data;

    if (
      input.agreedTermsVersion !== env.TERMS_VERSION ||
      input.agreedPrivacyVersion !== env.PRIVACY_VERSION
    ) {
      return c.json({ error: "terms_mismatch" }, 400);
    }

    const rejection = await checkCanApply(db, env, identity, ip);
    if (rejection) {
      const status = rejection.reason === "banned" ? 403 : 409;
      return c.json({ error: rejection.reason, ...rejection }, status);
    }

    await submitApplication(db, env, identity, input, ip);
    return c.json({ status: "pending" }, 201);
  });

  return app;
}
