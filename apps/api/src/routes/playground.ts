import { Hono, type Context } from "hono";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { getClientIp } from "../lib/ip.ts";
import { checkAndIncrement } from "../lib/rateLimiter.ts";

// Only the one method actually used below — accepts createQuoteApp's real
// return type (an OpenAPIHono), which a bare `Hono` parameter type doesn't
// structurally match.
interface Requestable {
  request(path: string, init?: RequestInit): Response | Promise<Response>;
}

// Anonymous access to the /playground page's demo, gated entirely on PLAYGROUND_API_KEY being set. Its two routes just wrap /api/quote and /api/fakequote through `quoteApp.request()` — a real, in-process fetch through that app's own full handler chain (validation, rendering, the hosted-image path and all), not a reimplementation of any of it.
// Two things happen before that call reaches quote.ts's normal handling: this IP is checked against its own small, separate rate-limit window (every anonymous visitor shares one underlying API key, so nothing here stops that key's own window from being exhausted by itself — this only keeps any single visitor from being the one who exhausts it for everyone else), and `options.hosted` is stripped from the body the same way apps/web's own /playground server action already does, so this endpoint carries the same "never written to storage" guarantee even if something reached it directly instead of through that page.
export function createPlaygroundApp(env: Env, quoteApp: Requestable) {
  const app = new Hono();
  if (!env.PLAYGROUND_API_KEY) return app;

  const db = getDb(env);
  const apiKey = env.PLAYGROUND_API_KEY;

  async function handle(c: Context, path: "/api/quote" | "/api/fakequote") {
    const ip = getClientIp(c);
    const rateLimit = checkAndIncrement(
      db,
      `playground-ip:${ip}`,
      env.PLAYGROUND_RATE_LIMIT_WINDOW_MS,
      env.PLAYGROUND_RATE_LIMIT_MAX,
    );
    if (!rateLimit.allowed) {
      return c.json({ error: "rate_limited" }, 429);
    }

    const body = await c.req.json().catch(() => null);
    if (body && typeof body === "object" && "options" in body) {
      const options = (body as { options?: unknown }).options;
      if (options && typeof options === "object") {
        delete (options as { hosted?: unknown }).hosted;
      }
    }

    return quoteApp.request(path, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  }

  app.post("/api/playground/quote", (c) => handle(c, "/api/quote"));
  app.post("/api/playground/fakequote", (c) => handle(c, "/api/fakequote"));

  return app;
}
