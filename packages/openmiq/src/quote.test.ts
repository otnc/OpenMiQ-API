import { ValidationError } from "@makeitaquote/utils/errors";
import { describe, expect, it } from "vitest";
import {
  applyInput,
  assertRenderable,
  emptyQuote,
  normalizeAuthorAvatar,
  normalizeAuthorName,
  normalizeLayout,
  normalizeText,
  normalizeWatermarkValue,
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

describe("normalizeAuthorAvatar", () => {
  it("passes a string URL through as .url", () => {
    expect(normalizeAuthorAvatar("https://example.com/a.png")).toEqual({
      url: "https://example.com/a.png",
      raw: null,
    });
  });

  it("stringifies a URL instance as .url", () => {
    expect(normalizeAuthorAvatar(new URL("https://example.com/a.png"))).toEqual(
      { url: "https://example.com/a.png", raw: null },
    );
  });

  it("treats null/undefined as absent", () => {
    expect(normalizeAuthorAvatar(null)).toEqual({ url: null, raw: null });
    expect(normalizeAuthorAvatar(undefined)).toEqual({ url: null, raw: null });
  });

  it("passes raw image bytes through as .raw, unchanged", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(normalizeAuthorAvatar(bytes)).toEqual({ url: null, raw: bytes });
  });

  it("rejects anything else", () => {
    expect(() => normalizeAuthorAvatar(42)).toThrow(ValidationError);
  });
});

describe("normalizeWatermarkValue", () => {
  it("treats a plain string as text", () => {
    expect(normalizeWatermarkValue("hi")).toEqual({
      text: "hi",
      url: null,
      raw: null,
    });
  });

  it("treats a URL as an image watermark", () => {
    expect(
      normalizeWatermarkValue(new URL("https://example.com/logo.png")),
    ).toEqual({ text: null, url: "https://example.com/logo.png", raw: null });
  });

  it("passes raw bytes through as an image watermark, unchanged", () => {
    const bytes = new Uint8Array([4, 5, 6]);
    expect(normalizeWatermarkValue(bytes)).toEqual({
      text: null,
      url: null,
      raw: bytes,
    });
  });

  it("treats null/undefined as absent", () => {
    expect(normalizeWatermarkValue(null)).toEqual({
      text: null,
      url: null,
      raw: null,
    });
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
