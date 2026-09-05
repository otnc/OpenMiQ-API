import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTestEnv } from "../../tests/helpers/env.ts";

vi.mock("./discordBotService.ts", () => ({
  fetchDiscordUserById: vi.fn(),
}));
vi.mock("./renderService.ts", () => ({
  renderQuote: vi.fn(),
}));

const { fetchDiscordUserById } = await import("./discordBotService.ts");
const { renderQuote } = await import("./renderService.ts");
const { generateSampleQuote, getSampleQuote } =
  await import("./sampleQuoteService.ts");

describe("generateSampleQuote", () => {
  beforeEach(() => {
    vi.mocked(fetchDiscordUserById).mockReset();
    vi.mocked(renderQuote).mockReset();
  });

  it("does nothing when DISCORD_BOT_TOKEN is unset", async () => {
    await generateSampleQuote(
      buildTestEnv({ DISCORD_BOT_TOKEN: undefined, ADMIN_DISCORD_IDS: ["1"] }),
    );
    expect(fetchDiscordUserById).not.toHaveBeenCalled();
  });

  it("does nothing when there is no admin configured", async () => {
    await generateSampleQuote(
      buildTestEnv({ DISCORD_BOT_TOKEN: "tok", ADMIN_DISCORD_IDS: [] }),
    );
    expect(fetchDiscordUserById).not.toHaveBeenCalled();
  });

  it("fetches the first admin's avatar and renders a sample quote from it", async () => {
    vi.mocked(fetchDiscordUserById).mockResolvedValue({
      id: "1",
      username: "alice",
      avatarUrl: "https://cdn.discordapp.com/avatars/1/x.png",
    });
    const buffer = Buffer.from("fake-png");
    vi.mocked(renderQuote).mockResolvedValue(buffer);

    await generateSampleQuote(
      buildTestEnv({ DISCORD_BOT_TOKEN: "tok", ADMIN_DISCORD_IDS: ["1", "2"] }),
    );

    expect(fetchDiscordUserById).toHaveBeenCalledWith("tok", "1");
    expect(renderQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: "alice",
        authorAvatarUrl: "https://cdn.discordapp.com/avatars/1/x.png",
      }),
      expect.anything(),
    );
    expect(getSampleQuote()).toBe(buffer);
  });

  it("swallows errors instead of throwing (best-effort, must not block startup)", async () => {
    vi.mocked(fetchDiscordUserById).mockRejectedValue(
      new Error("network down"),
    );
    await expect(
      generateSampleQuote(
        buildTestEnv({ DISCORD_BOT_TOKEN: "tok", ADMIN_DISCORD_IDS: ["1"] }),
      ),
    ).resolves.toBeUndefined();
  });
});
