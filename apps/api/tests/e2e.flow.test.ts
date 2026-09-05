import { afterAll, describe, expect, it, vi } from "vitest";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";
import { sessionCookieHeader } from "./helpers/session.ts";
import type { SessionIdentity } from "../src/services/sessionService.ts";

vi.mock("../src/services/discordWebhookService.ts", () => ({
  sendReviewMessage: vi
    .fn()
    .mockResolvedValue({ id: "msg-1", channelId: "chan-1" }),
  disableReviewButtons: vi.fn().mockResolvedValue(undefined),
}));

const { createApp } = await import("../src/app.ts");

// Exercises the full path described in PLAN.md Phase 6: an applicant links
// their Discord account, applies, an admin approves them, they issue an API
// key from the Console, and that key actually works against the quote API —
// end to end, over real HTTP requests into the assembled app (no mocked
// routes), with only the outbound Discord webhook call stubbed.
describe("apply -> approve -> issue key -> use API key", () => {
  const { url: DATABASE_URL, cleanup } = createTestDbFile();
  const env = buildTestEnv({ DATABASE_URL });
  const app = createApp(env);

  const applicant: SessionIdentity = {
    discordId: "applicant-1",
    discordUsername: "applicant",
    email: "applicant@example.com",
  };
  const admin: SessionIdentity = {
    discordId: "admin-1",
    discordUsername: "admin",
    email: "admin@example.com",
  };

  afterAll(cleanup);

  it("rejects an application submitted while logged out", async () => {
    const res = await app.request("/api/console/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "x".repeat(20),
        fingerprint: "fp-1",
        agreedTermsVersion: "1",
        agreedPrivacyVersion: "1",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("submits an application once logged in", async () => {
    const cookie = await sessionCookieHeader(env, applicant);
    const res = await app.request("/api/console/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie,
        "X-Forwarded-For": "203.0.113.1",
      },
      body: JSON.stringify({
        message: "I would like to use this API for my project.",
        fingerprint: "fp-1",
        agreedTermsVersion: "1",
        agreedPrivacyVersion: "1",
      }),
    });
    expect(res.status).toBe(201);

    const meRes = await app.request("/api/console/me", { headers: { cookie } });
    const me = await meRes.json();
    expect(me.status).toBe("pending");
  });

  it("refuses approval from a non-admin", async () => {
    const cookie = await sessionCookieHeader(env, applicant);
    const listRes = await app.request(
      "/api/admin/applications?status=pending",
      { headers: { cookie: await sessionCookieHeader(env, admin) } },
    );
    const [application] = await listRes.json();

    const res = await app.request(
      `/api/admin/applications/${application.id}/approve`,
      { method: "POST", headers: { cookie } },
    );
    expect(res.status).toBe(403);
  });

  let plaintextApiKey: string;

  it("approves the application as an admin", async () => {
    const adminCookie = await sessionCookieHeader(env, admin);
    const listRes = await app.request(
      "/api/admin/applications?status=pending",
      { headers: { cookie: adminCookie } },
    );
    const [application] = await listRes.json();

    const approveRes = await app.request(
      `/api/admin/applications/${application.id}/approve`,
      { method: "POST", headers: { cookie: adminCookie } },
    );
    expect(approveRes.status).toBe(200);

    const meRes = await app.request("/api/console/me", {
      headers: { cookie: await sessionCookieHeader(env, applicant) },
    });
    const me = await meRes.json();
    expect(me.status).toBe("approved");
  });

  it("issues an API key from the console once approved", async () => {
    const cookie = await sessionCookieHeader(env, applicant);
    const res = await app.request("/api/console/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "ci-test-key", expiresAt: null }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.plaintext).toMatch(/^miq_live_/);
    plaintextApiKey = body.plaintext;
  });

  it("rejects quote generation without an API key", async () => {
    const res = await app.request("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName: "Alice", text: "Hello!" }),
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("missing_api_key");
  });

  it("generates a quote image using the issued API key", async () => {
    const res = await app.request("/api/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": plaintextApiKey,
      },
      body: JSON.stringify({ authorName: "Alice", text: "Hello, world!" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("RateLimit-Remaining")).toBe(
      String(env.RATE_LIMIT_MAX - 1),
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    // PNG magic bytes
    expect(Array.from(bytes.slice(0, 8))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  }, 15_000);

  it("reflects the consumed request in GET /api/usage without consuming another", async () => {
    const first = await app.request("/api/usage", {
      headers: { "X-API-Key": plaintextApiKey },
    });
    const firstBody = await first.json();
    expect(firstBody.requestCount).toBe(1);

    const second = await app.request("/api/usage", {
      headers: { "X-API-Key": plaintextApiKey },
    });
    const secondBody = await second.json();
    expect(secondBody.requestCount).toBe(1);
    expect(secondBody.remaining).toBe(firstBody.remaining);
  });

  it("freezes the API key once an admin revokes the account", async () => {
    const adminCookie = await sessionCookieHeader(env, admin);
    const usersRes = await app.request("/api/admin/users", {
      headers: { cookie: adminCookie },
    });
    const usersList = await usersRes.json();
    const target = usersList.find(
      (u: { discordId: string }) => u.discordId === applicant.discordId,
    );

    const revokeRes = await app.request(
      `/api/admin/users/${target.id}/revoke`,
      { method: "POST", headers: { cookie: adminCookie } },
    );
    expect(revokeRes.status).toBe(200);

    const quoteRes = await app.request("/api/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": plaintextApiKey,
      },
      body: JSON.stringify({ authorName: "Alice", text: "Hello again" }),
    });
    expect(quoteRes.status).toBe(403);
    expect((await quoteRes.json()).error).toBe("account_not_approved");
  });
});
