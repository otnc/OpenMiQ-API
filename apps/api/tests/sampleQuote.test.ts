import { describe, expect, it, vi } from "vitest";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";

vi.mock("../src/services/discordBotService.ts", () => ({
  fetchDiscordUserById: vi.fn().mockResolvedValue({
    id: "1",
    username: "alice",
    avatarUrl: "https://cdn.discordapp.com/avatars/1/x.png",
  }),
}));

const { createApp } = await import("../src/app.ts");
const { generateSampleQuote } =
  await import("../src/services/sampleQuoteService.ts");

describe("GET /api/sample-quote", () => {
  const { url: DATABASE_URL } = createTestDbFile();

  it("404s before generateSampleQuote() has ever run", async () => {
    const app = createApp(
      buildTestEnv({ DATABASE_URL, DISCORD_BOT_TOKEN: undefined }),
    );
    const res = await app.request("/api/sample-quote");
    expect(res.status).toBe(404);
  });

  it("serves the generated PNG once available", async () => {
    const env = buildTestEnv({
      DATABASE_URL,
      DISCORD_BOT_TOKEN: "tok",
      ADMIN_DISCORD_IDS: ["1"],
    });
    await generateSampleQuote(env);

    const app = createApp(env);
    const res = await app.request("/api/sample-quote");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 8))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  }, 15_000);
});
