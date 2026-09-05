import { createMiddleware } from "hono/factory";
import type { Env } from "../config/env.ts";
import type { SessionIdentity } from "../services/sessionService.ts";

type Variables = { identity: SessionIdentity | null };

export function requireAdmin(env: Env) {
  const adminIds = new Set(env.ADMIN_DISCORD_IDS);
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const identity = c.get("identity");
    if (!identity || !adminIds.has(identity.discordId)) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
  });
}
