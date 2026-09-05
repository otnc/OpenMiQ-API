import { describe, expect, it } from "vitest";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";
import { createApp } from "../src/app.ts";

describe("legal endpoints", () => {
  const { url: DATABASE_URL } = createTestDbFile();
  const env = buildTestEnv({ DATABASE_URL, TERMS_VERSION: "2" });
  const app = createApp(env);

  it("serves the current terms version", async () => {
    const res = await app.request("/api/legal/terms?lang=en");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe("2");
    expect(body.content).toContain("Terms of Service");
  });

  it("serves the Japanese translation on request", async () => {
    const res = await app.request("/api/legal/terms?lang=ja");
    const body = await res.json();
    expect(body.lang).toBe("ja");
    expect(body.content).toContain("利用規約");
  });

  it("404s when TERMS_VERSION points at a version with no content", async () => {
    const missingVersionApp = createApp(
      buildTestEnv({ DATABASE_URL, TERMS_VERSION: "999" }),
    );
    const res = await missingVersionApp.request("/api/legal/terms?lang=en");
    expect(res.status).toBe(404);
  });

  it("computes a diff against an earlier agreed version", async () => {
    const res = await app.request("/api/legal/terms/diff?from=1&lang=en");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.parts.some((p: { added: boolean }) => p.added)).toBe(true);
  });

  it("400s when the from query param is missing", async () => {
    const res = await app.request("/api/legal/terms/diff?lang=en");
    expect(res.status).toBe(400);
  });

  it("reports unavailable for an unknown from version", async () => {
    const res = await app.request("/api/legal/terms/diff?from=999&lang=en");
    const body = await res.json();
    expect(body.available).toBe(false);
  });
});
