import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { hostedImages, users } from "@openmiq/db";
import { createApp } from "../src/app.ts";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";
import { createTestImageDir } from "./helpers/testImageDir.ts";
import { getDb } from "../src/db.ts";
import { newId } from "../src/lib/ids.ts";
import { createApiKey } from "../src/services/apiKeyService.ts";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("POST /api/uploads", () => {
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
      discordUsername: "uploads-test-user",
      email: "uploads-test@example.com",
      status: "approved",
      agreedTermsVersion: env.TERMS_VERSION,
      agreedPrivacyVersion: env.PRIVACY_VERSION,
    });
    const key = await createApiKey(
      db,
      userId,
      { name: "uploads-test", expiresAt: null },
      env.MAX_API_KEYS_PER_USER,
    );
    if (!("plaintext" in key)) throw new Error("expected a created key");
    return key.plaintext;
  }

  it("rejects a request without an API key", async () => {
    const form = new FormData();
    form.append("file", new Blob([TINY_PNG], { type: "image/png" }), "a.png");
    const res = await app.request("/api/uploads", {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(401);
  });

  it("stores the file and serves it back with a matching Content-Type", async () => {
    const apiKey = await issueApiKey();
    const form = new FormData();
    form.append("file", new Blob([TINY_PNG], { type: "image/png" }), "a.png");

    const uploadRes = await app.request("/api/uploads", {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: form,
    });
    expect(uploadRes.status).toBe(201);
    const { url } = await uploadRes.json();
    expect(url).toMatch(/\/api\/images\/.+$/);

    const id = url.split("/").pop();
    const fetchRes = await app.request(`/api/images/${id}`);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.headers.get("Content-Type")).toBe("image/png");
    const bytes = Buffer.from(await fetchRes.arrayBuffer());
    expect(bytes.equals(TINY_PNG)).toBe(true);

    const db = getDb(env);
    const rows = await db
      .select()
      .from(hostedImages)
      .where(eq(hostedImages.id, id));
    expect(rows[0]?.contentType).toBe("image/png");
  });

  it("rejects an unsupported content type", async () => {
    const apiKey = await issueApiKey();
    const form = new FormData();
    form.append(
      "file",
      new Blob([Buffer.from("not an image")], { type: "text/plain" }),
      "a.txt",
    );
    const res = await app.request("/api/uploads", {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: form,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });

  it("rejects a request with no file field", async () => {
    const apiKey = await issueApiKey();
    const form = new FormData();
    const res = await app.request("/api/uploads", {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: form,
    });
    expect(res.status).toBe(400);
  });

  it("can be referenced as authorAvatarUrl in a real /api/quote call", async () => {
    const apiKey = await issueApiKey();
    const form = new FormData();
    form.append("file", new Blob([TINY_PNG], { type: "image/png" }), "a.png");
    const uploadRes = await app.request("/api/uploads", {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: form,
    });
    const { url } = await uploadRes.json();

    const quoteRes = await app.request("/api/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        authorName: "Alice",
        text: "uses an uploaded avatar",
        authorAvatarUrl: url,
      }),
    });
    expect(quoteRes.status).toBe(200);
    expect(quoteRes.headers.get("Content-Type")).toBe("image/png");
  }, 15_000);
});
