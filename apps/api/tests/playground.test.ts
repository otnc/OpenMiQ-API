import { afterAll, describe, expect, it } from "vitest";
import { users, hostedImages } from "@openmiq/db";
import { createApp } from "../src/app.ts";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";
import { getDb } from "../src/db.ts";
import { newId } from "../src/lib/ids.ts";
import { createApiKey } from "../src/services/apiKeyService.ts";

async function seedApprovedUserWithKey(env: ReturnType<typeof buildTestEnv>) {
  const db = getDb(env);
  const userId = newId();
  await db.insert(users).values({
    id: userId,
    discordId: `discord-${userId}`,
    discordUsername: "playground-demo-user",
    email: "playground-demo@example.com",
    status: "approved",
    agreedTermsVersion: env.TERMS_VERSION,
    agreedPrivacyVersion: env.PRIVACY_VERSION,
  });
  const key = await createApiKey(
    db,
    userId,
    { name: "playground-demo", expiresAt: null },
    env.MAX_API_KEYS_PER_USER,
  );
  if (!("plaintext" in key)) throw new Error("expected a created key");
  return key.plaintext;
}

describe("POST /api/playground/quote (anonymous demo)", () => {
  const { url: DATABASE_URL, cleanup } = createTestDbFile();
  afterAll(cleanup);

  it("404s when PLAYGROUND_API_KEY is unset — no fallback exists at all", async () => {
    const env = buildTestEnv({ DATABASE_URL });
    const app = createApp(env);
    const res = await app.request("/api/playground/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName: "a", text: "b" }),
    });
    expect(res.status).toBe(404);
  });

  it("renders an image using the configured shared key, with no X-API-Key header", async () => {
    const env = buildTestEnv({ DATABASE_URL });
    const plaintext = await seedApprovedUserWithKey(env);
    const envWithKey = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_API_KEY: plaintext,
    });
    const app = createApp(envWithKey);

    const res = await app.request("/api/playground/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.10",
      },
      body: JSON.stringify({ authorName: "Alice", text: "Hello!" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  }, 15_000);

  it("strips options.hosted even if the client sent it — never uploads", async () => {
    const env = buildTestEnv({ DATABASE_URL });
    const plaintext = await seedApprovedUserWithKey(env);
    const envWithKey = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_API_KEY: plaintext,
    });
    const app = createApp(envWithKey);
    const db = getDb(envWithKey);

    const res = await app.request("/api/playground/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.11",
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

  it("rate-limits by IP separately from the shared key's own window", async () => {
    const env = buildTestEnv({ DATABASE_URL });
    const plaintext = await seedApprovedUserWithKey(env);
    const envWithKey = buildTestEnv({
      DATABASE_URL,
      PLAYGROUND_API_KEY: plaintext,
      PLAYGROUND_RATE_LIMIT_MAX: 1,
    });
    const app = createApp(envWithKey);
    const ip = "203.0.113.12";
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
});
