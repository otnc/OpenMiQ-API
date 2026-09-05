import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDiscordUserById } from "./discordBotService.ts";

describe("fetchDiscordUserById", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the bot token and builds the avatar CDN URL when the user has a custom avatar", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "123456789",
          username: "alice",
          discriminator: "0",
          avatar: "abcdef1234567890",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = await fetchDiscordUserById("bot-token", "123456789");

    expect(user).toEqual({
      id: "123456789",
      username: "alice",
      avatarUrl:
        "https://cdn.discordapp.com/avatars/123456789/abcdef1234567890.png",
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://discord.com/api/v10/users/123456789");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bot bot-token");
  });

  it("falls back to a default avatar (migrated account) when none is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "123456789",
          username: "alice",
          discriminator: "0",
          avatar: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = await fetchDiscordUserById("bot-token", "123456789");
    expect(user.avatarUrl).toMatch(
      /^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/[0-5]\.png$/,
    );
  });

  it("falls back to a default avatar (legacy discriminator) when none is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "123456789",
          username: "alice",
          discriminator: "1234",
          avatar: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = await fetchDiscordUserById("bot-token", "123456789");
    expect(user.avatarUrl).toBe(
      "https://cdn.discordapp.com/embed/avatars/4.png",
    );
  });
});
