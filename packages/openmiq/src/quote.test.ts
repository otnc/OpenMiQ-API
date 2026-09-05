import { ValidationError } from "@makeitaquote/utils/errors";
import { describe, expect, it } from "vitest";
import {
  applyInput,
  assertRenderable,
  emptyQuote,
  normalizeAuthorAvatarUrl,
  normalizeAuthorName,
  normalizeLayout,
  normalizeText,
} from "./quote.ts";

describe("normalizeText/normalizeAuthorName", () => {
  it("accepts a plain string", () => {
    expect(normalizeText("hello")).toBe("hello");
    expect(normalizeAuthorName("alice")).toBe("alice");
  });

  it("rejects a non-string", () => {
    expect(() => normalizeText(42)).toThrow(ValidationError);
  });

  it("rejects text over the length limit", () => {
    expect(() => normalizeText("a".repeat(4001))).toThrow(ValidationError);
    expect(normalizeText("a".repeat(4000))).toHaveLength(4000);
  });
});

describe("normalizeAuthorAvatarUrl", () => {
  it("passes a string URL through", () => {
    expect(normalizeAuthorAvatarUrl("https://example.com/a.png")).toBe(
      "https://example.com/a.png",
    );
  });

  it("stringifies a URL instance", () => {
    expect(normalizeAuthorAvatarUrl(new URL("https://example.com/a.png"))).toBe(
      "https://example.com/a.png",
    );
  });

  it("treats null/undefined as absent", () => {
    expect(normalizeAuthorAvatarUrl(null)).toBeNull();
    expect(normalizeAuthorAvatarUrl(undefined)).toBeNull();
  });

  it("rejects raw image bytes — the API only accepts a URL", () => {
    expect(() => normalizeAuthorAvatarUrl(new Uint8Array([1, 2, 3]))).toThrow(
      ValidationError,
    );
  });
});

describe("normalizeLayout", () => {
  it("accepts the two valid literals", () => {
    expect(normalizeLayout("side")).toBe("side");
    expect(normalizeLayout("new")).toBe("new");
  });

  it("treats null/undefined as absent", () => {
    expect(normalizeLayout(null)).toBeNull();
    expect(normalizeLayout(undefined)).toBeNull();
  });

  it("rejects anything else", () => {
    expect(() => normalizeLayout("side-by-side")).toThrow(ValidationError);
  });
});

describe("applyInput", () => {
  it("only overwrites the fields provided", () => {
    const base = { ...emptyQuote(), text: "keep me", theme: "sunset" };
    const next = applyInput(base, { authorName: "alice" });
    expect(next.text).toBe("keep me");
    expect(next.theme).toBe("sunset");
    expect(next.authorName).toBe("alice");
  });

  it("rejects a non-object input", () => {
    expect(() => applyInput(emptyQuote(), null as never)).toThrow(
      ValidationError,
    );
  });
});

describe("assertRenderable", () => {
  it("requires both text and authorName", () => {
    expect(() => assertRenderable(emptyQuote())).toThrow(ValidationError);
    expect(() => assertRenderable({ ...emptyQuote(), text: "hi" })).toThrow(
      ValidationError,
    );
    expect(() =>
      assertRenderable({ ...emptyQuote(), text: "hi", authorName: "alice" }),
    ).not.toThrow();
  });
});
