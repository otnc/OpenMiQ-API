import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users, hostedImages } from "@openmiq/db";
import { createApp } from "../src/app.ts";
import { createQuoteApp } from "../src/routes/quote.ts";
import { createUploadsApp } from "../src/routes/uploads.ts";
import { createPlaygroundApp } from "../src/routes/playground.ts";
import { createPlaygroundKeyManager } from "../src/services/playgroundKeyService.ts";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";
import { getDb } from "../src/db.ts";

// Builds just the pieces under test, with a key manager this test controls directly (rotate() awaited up front) — going through createApp() itself would race its own fire-and-forget initial rotate().
function buildPlaygroundApp(env: ReturnType<typeof buildTestEnv>) {
  const db = getDb(env);
  const quoteApp = createQuoteApp(env);
  const uploadsApp = createUploadsApp(env);
  const keyManager = createPlaygroundKeyManager(db, env);
  const app = createPlaygroundApp(env, quoteApp, uploadsApp, keyManager);
  return { app, keyManager, db };
}

describe("POST /api/playground/quote (anonymous demo)", () => {
  const { url: DATABASE_URL, cleanup } = createTestDbFile();
  afterAll(cleanup);

  it("404s when PLAYGROUND_SHARED_KEY_LIMIT is 0 — the routes don't exist at all", async () => {
    const env = buildTestEnv({ DATABASE_URL, PLAYGROUND_SHARED_KEY_LIMIT: 0 });
    // createApp() itself here, not buildPlaygroundApp() — confirms the real wiring in app.ts also skips registering these routes, not just createPlaygroundApp() in isolation.
    const app = createApp(env);
    const res = await app.request("/api/playground/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName: "a", text: "b" }),
    });
    expect(res.status).toBe(404);
  });

  it("503s before the first rotate() completes", async () => {
    const env = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_SHARED_KEY_LIMIT: 500,
    });
    const { app } = buildPlaygroundApp(env);
    const res = await app.request("/api/playground/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName: "a", text: "b" }),
    });
    expect(res.status).toBe(503);
  });

  it("renders an image using the internally-managed shared key, with no client-supplied X-API-Key", async () => {
    const env = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_SHARED_KEY_LIMIT: 500,
    });
    const { app, keyManager } = buildPlaygroundApp(env);
    await keyManager.rotate();

    const res = await app.request("/api/playground/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.20",
      },
      body: JSON.stringify({ authorName: "Alice", text: "Hello!" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  }, 15_000);

  it("strips options.hosted even if the client sent it — never uploads", async () => {
    const env = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_SHARED_KEY_LIMIT: 500,
    });
    const { app, keyManager, db } = buildPlaygroundApp(env);
    await keyManager.rotate();

    const res = await app.request("/api/playground/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.21",
      },
      body: JSON.stringify({
        authorName: "Alice",
        text: "trying to sneak hosted",
        options: { hosted: true },
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(await db.select().from(hostedImages)).toHaveLength(0);
  }, 15_000);

  it("rate-limits by IP separately from the shared usage cap", async () => {
    const env = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_SHARED_KEY_LIMIT: 500,
      PLAYGROUND_RATE_LIMIT_MAX: 1,
    });
    const { app, keyManager } = buildPlaygroundApp(env);
    await keyManager.rotate();
    const ip = "203.0.113.22";
    const body = JSON.stringify({ authorName: "Alice", text: "one" });

    const first = await app.request("/api/playground/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
      body,
    });
    expect(first.status).toBe(200);

    const second = await app.request("/api/playground/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
      body,
    });
    expect(second.status).toBe(429);
    expect((await second.json()).error).toBe("rate_limited");
  }, 15_000);

  it("enforces PLAYGROUND_SHARED_KEY_LIMIT across different IPs", async () => {
    const env = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_SHARED_KEY_LIMIT: 1,
    });
    const { app, keyManager } = buildPlaygroundApp(env);
    await keyManager.rotate();
    const body = JSON.stringify({ authorName: "Alice", text: "one" });

    const first = await app.request("/api/playground/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.30",
      },
      body,
    });
    expect(first.status).toBe(200);

    // A different IP — the per-IP limiter doesn't apply, only the shared cap.
    const second = await app.request("/api/playground/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.31",
      },
      body,
    });
    expect(second.status).toBe(429);
    expect((await second.json()).error).toBe("rate_limited");
  }, 15_000);

  it("rotate() deletes the previous key and issues a working new one, reusing the same internal user", async () => {
    const env = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_SHARED_KEY_LIMIT: 500,
    });
    const { app, keyManager, db } = buildPlaygroundApp(env);

    await keyManager.rotate();
    const firstKey = keyManager.getCurrentKey();
    const firstId = keyManager.getCurrentKeyId();

    await keyManager.rotate();
    const secondKey = keyManager.getCurrentKey();
    const secondId = keyManager.getCurrentKeyId();

    expect(secondKey).not.toBe(firstKey);
    expect(secondId).not.toBe(firstId);

    const res = await app.request("/api/playground/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.40",
      },
      body: JSON.stringify({ authorName: "Alice", text: "after rotation" }),
    });
    expect(res.status).toBe(200);

    const systemUsers = await db
      .select()
      .from(users)
      .where(eq(users.discordId, "system:playground-shared"));
    expect(systemUsers).toHaveLength(1);
  }, 15_000);
});

describe("POST /api/playground/uploads (anonymous demo)", () => {
  const { url: DATABASE_URL, cleanup } = createTestDbFile();
  afterAll(cleanup);
  const TINY_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );

  it("uploads through the shared key and returns a working URL, with no client-supplied X-API-Key", async () => {
    const env = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_SHARED_KEY_LIMIT: 500,
    });
    const { app, keyManager } = buildPlaygroundApp(env);
    await keyManager.rotate();

    const form = new FormData();
    form.append("file", new Blob([TINY_PNG], { type: "image/png" }), "a.png");
    const res = await app.request("/api/playground/uploads", {
      method: "POST",
      headers: { "X-Forwarded-For": "203.0.113.50" },
      body: form,
    });
    expect(res.status).toBe(201);
    const { url } = await res.json();
    expect(url).toMatch(/\/api\/images\/.+$/);
  });

  it("shares the same IP/usage limits as /api/playground/quote", async () => {
    const env = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_SHARED_KEY_LIMIT: 500,
      PLAYGROUND_RATE_LIMIT_MAX: 1,
    });
    const { app, keyManager } = buildPlaygroundApp(env);
    await keyManager.rotate();
    const ip = "203.0.113.51";

    const form = () => {
      const f = new FormData();
      f.append("file", new Blob([TINY_PNG], { type: "image/png" }), "a.png");
      return f;
    };

    const first = await app.request("/api/playground/uploads", {
      method: "POST",
      headers: { "X-Forwarded-For": ip },
      body: form(),
    });
    expect(first.status).toBe(201);

    const second = await app.request("/api/playground/uploads", {
      method: "POST",
      headers: { "X-Forwarded-For": ip },
      body: form(),
    });
    expect(second.status).toBe(429);
  });
});
