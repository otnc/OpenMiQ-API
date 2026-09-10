import { afterAll, describe, expect, it } from "vitest";
import { users } from "@openmiq/db";
import { createApp } from "../src/app.ts";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";
import { createTestImageDir } from "./helpers/testImageDir.ts";
import { getDb } from "../src/db.ts";
import { newId } from "../src/lib/ids.ts";
import { createApiKey } from "../src/services/apiKeyService.ts";

describe("POST /api/quote", () => {
  const { url: DATABASE_URL, cleanup: cleanupDb } = createTestDbFile();
  const { dir: STORAGE_LOCAL_DIR, cleanup: cleanupImages } =
    createTestImageDir();
  const env = buildTestEnv({ DATABASE_URL, STORAGE_LOCAL_DIR });
  const app = createApp(env);
  afterAll(() => {
    cleanupDb();
    cleanupImages();
  });

  async function issueApiKey(): Promise<string> {
    const db = getDb(env);
    const userId = newId();
    await db.insert(users).values({
      id: userId,
      discordId: `discord-${userId}`,
      discordUsername: "quote-test-user",
      email: "quote-test@example.com",
      status: "approved",
      agreedTermsVersion: env.TERMS_VERSION,
      agreedPrivacyVersion: env.PRIVACY_VERSION,
    });
    const key = await createApiKey(
      db,
      userId,
      { name: "quote-test", expiresAt: null },
      env.MAX_API_KEYS_PER_USER,
    );
    if (!("plaintext" in key)) throw new Error("expected a created key");
    return key.plaintext;
  }

  it("renders a real image for a valid request", async () => {
    const apiKey = await issueApiKey();
    const res = await app.request("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ authorName: "Alice", text: "hello" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  }, 15_000);

  // A named theme from OpenMiQ's own 39-color catalog (e.g. "tokyo") isn't
  // a CSS color makeitaquote itself understands — this API's `theme`
  // intentionally only accepts raw CSS colors (DESIGN.md §8.5), so
  // makeitaquote throws its own ValidationError deep inside toBuffer(),
  // well after quoteRequestSchema's own safeParse() already passed. Without
  // catching it, that bubbled up as a bare 500.
  it("returns 400, not 500, for a theme value makeitaquote itself rejects", async () => {
    const apiKey = await issueApiKey();
    const res = await app.request("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({
        authorName: "Alice",
        text: "hello",
        theme: "tokyo",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(body.issues[0].field).toBe("theme.background");
  });
});
