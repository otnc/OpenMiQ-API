import { ValidationError } from "@makeitaquote/utils/errors";
import { describe, expect, it } from "vitest";
import { fromMessage } from "./source.ts";

const baseMessage = {
  content: "hello world",
  author: {
    username: "alice",
    globalName: "Alice",
    displayAvatarURL: () => "https://cdn.example.com/global.png",
  },
};

describe("fromMessage", () => {
  it("rejects something that isn't message-shaped", () => {
    expect(() => fromMessage({})).toThrow(ValidationError);
    expect(() => fromMessage(null)).toThrow(ValidationError);
  });

  it("prefers the guild nickname/avatar over the global ones by default", () => {
    const message = {
      ...baseMessage,
      member: {
        nickname: "AliceInServer",
        displayAvatarURL: () => "https://cdn.example.com/guild.png",
      },
    };
    const quote = fromMessage(message);
    expect(quote.authorName).toBe("AliceInServer");
    expect(quote.authorAvatarUrl).toBe("https://cdn.example.com/guild.png");
  });

  it("falls back to the global name/avatar when there is no guild member", () => {
    const quote = fromMessage(baseMessage);
    expect(quote.authorName).toBe("Alice");
    expect(quote.authorAvatarUrl).toBe("https://cdn.example.com/global.png");
  });

  it("can be told to prefer the account-wide name/avatar even with a guild member present", () => {
    const message = {
      ...baseMessage,
      member: {
        nickname: "AliceInServer",
        displayAvatarURL: () => "https://cdn.example.com/guild.png",
      },
    };
    const quote = fromMessage(message, { name: "global", avatar: "global" });
    expect(quote.authorName).toBe("Alice");
    expect(quote.authorAvatarUrl).toBe("https://cdn.example.com/global.png");
  });

  it("quotes the message content verbatim by default", () => {
    const quote = fromMessage(baseMessage);
    expect(quote.text).toBe("hello world");
  });

  it("always sets authorUsername to the account handle, regardless of which name option was picked", () => {
    const message = {
      ...baseMessage,
      member: {
        nickname: "AliceInServer",
        displayAvatarURL: () => "https://cdn.example.com/guild.png",
      },
    };
    expect(fromMessage(message).authorUsername).toBe("alice");
    expect(fromMessage(message, { name: "global" }).authorUsername).toBe(
      "alice",
    );
  });
});
