import { describe, expect, it } from "vitest";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";
import { createApp } from "../src/app.ts";

describe("POST /api/auth/logout", () => {
  const { url: DATABASE_URL } = createTestDbFile();

  it("clears the session cookie and redirects home", async () => {
    const env = buildTestEnv({ DATABASE_URL });
    const app = createApp(env);
    const res = await app.request("/api/auth/logout", {
      method: "POST",
      redirect: "manual",
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(env.APP_BASE_URL);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/openmiq_session=;/);
  });
});
