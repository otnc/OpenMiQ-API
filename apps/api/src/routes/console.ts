import { Hono } from "hono";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { requireSession } from "../middleware/session.ts";
import { resolveConsoleStatus } from "../services/userService.ts";
import type { SessionIdentity } from "../services/sessionService.ts";

type Variables = { identity: SessionIdentity | null };

export function createConsoleApp(env: Env) {
  const app = new Hono<{ Variables: Variables }>();
  const db = getDb(env);

  app.get("/api/console/me", requireSession(), async (c) => {
    const identity = c.get("identity");
    if (!identity) return c.json({ error: "unauthorized" }, 401);

    const status = await resolveConsoleStatus(db, identity);
    return c.json({
      discordId: identity.discordId,
      discordUsername: identity.discordUsername,
      email: identity.email,
      status,
    });
  });

  return app;
}
