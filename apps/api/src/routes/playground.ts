import { Hono, type Context } from "hono";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { getClientIp } from "../lib/ip.ts";
import { checkAndIncrement } from "../lib/rateLimiter.ts";
import type { PlaygroundKeyManager } from "../services/playgroundKeyService.ts";

// Only the one method actually used below — accepts createQuoteApp's/createUploadsApp's real return type (an OpenAPIHono), which a bare `Hono` parameter type doesn't structurally match.
interface Requestable {
  request(path: string, init?: RequestInit): Response | Promise<Response>;
}

// Anonymous access to the /playground page's demo, gated entirely on PLAYGROUND_SHARED_KEY_LIMIT being above 0 (see playgroundKeyService.ts, which owns the actual key's lifecycle). Its three routes just wrap /api/quote, /api/fakequote and /api/uploads through `.request()` on those apps' own instances — a real, in-process fetch through each app's own full handler chain (validation, rendering/storing, the hosted-image path and all), not a reimplementation of any of it.
// Two things happen before any of those calls: this IP is checked against its own small, separate rate-limit window (so no single visitor can hog the shared allocation), and the shared key's own rotation-scoped usage cap is checked (PLAYGROUND_SHARED_KEY_LIMIT, reset every time playgroundKeyService rotates the key). The quote/fakequote routes additionally strip `options.hosted` from the body the same way apps/web's own /playground server action already does, so this endpoint carries the same "never written to storage" guarantee even if something reached it directly instead of through that page.
export function createPlaygroundApp(
  env: Env,
  quoteApp: Requestable,
  uploadsApp: Requestable,
  keyManager: PlaygroundKeyManager,
) {
  const app = new Hono();
  if (env.PLAYGROUND_SHARED_KEY_LIMIT <= 0) return app;

  const db = getDb(env);

  // Returns the shared key once both limits below have cleared, or a ready-to-return Response if either was hit (503 for "no key issued yet", 429 for rate limits) — every route here needs exactly this check before doing its own thing.
  function checkLimitsAndGetKey(c: Context): string | Response {
    const apiKey = keyManager.getCurrentKey();
    const keyId = keyManager.getCurrentKeyId();
    if (!apiKey || !keyId) {
      // Between process startup and the first rotate() completing — a narrow window, not a steady state.
      return c.json({ error: "playground_not_ready" }, 503);
    }

    const ip = getClientIp(c);
    const ipLimit = checkAndIncrement(
      db,
      `playground-ip:${ip}`,
      env.PLAYGROUND_RATE_LIMIT_WINDOW_MS,
      env.PLAYGROUND_RATE_LIMIT_MAX,
    );
    if (!ipLimit.allowed) {
      return c.json({ error: "rate_limited" }, 429);
    }

    // A generous window (the rotation period itself) since the bucket is scoped to this one rotation's key id anyway — the next rotate() starts a fresh id and therefore a fresh bucket regardless of this number.
    const sharedLimit = checkAndIncrement(
      db,
      `playground-shared-usage:${keyId}`,
      env.PLAYGROUND_SHARED_KEY_ROTATE_MINUTES * 60_000,
      env.PLAYGROUND_SHARED_KEY_LIMIT,
    );
    if (!sharedLimit.allowed) {
      return c.json({ error: "rate_limited" }, 429);
    }

    return apiKey;
  }

  async function handleQuote(
    c: Context,
    path: "/api/quote" | "/api/fakequote",
  ) {
    const apiKey = checkLimitsAndGetKey(c);
    if (apiKey instanceof Response) return apiKey;

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

  app.post("/api/playground/quote", (c) => handleQuote(c, "/api/quote"));
  app.post("/api/playground/fakequote", (c) =>
    handleQuote(c, "/api/fakequote"),
  );

  app.post("/api/playground/uploads", async (c) => {
    const apiKey = checkLimitsAndGetKey(c);
    if (apiKey instanceof Response) return apiKey;

    const incoming = await c.req.formData().catch(() => null);
    if (!incoming) {
      return c.json(
        {
          error: "invalid_request",
          issues: [{ message: "file is required (multipart/form-data)" }],
        },
        400,
      );
    }

    return uploadsApp.request("/api/uploads", {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: incoming,
    });
  });

  return app;
}
