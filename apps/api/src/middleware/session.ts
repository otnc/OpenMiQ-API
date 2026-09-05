import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { Env } from "../config/env.ts";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionIdentity,
} from "../services/sessionService.ts";

type Variables = { identity: SessionIdentity | null };

export function sessionMiddleware(env: Env) {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const payload = token ? await verifySessionToken(env, token) : null;
    c.set("identity", payload);
    await next();
  });
}

export function requireSession() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    if (!c.get("identity")) {
      return c.json({ error: "unauthorized" }, 401);
    }
    await next();
  });
}
