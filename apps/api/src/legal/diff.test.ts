import { describe, expect, it } from "vitest";
import { diffVersions } from "./diff.ts";
import type { LocalizedText } from "./content.ts";

const versions: Record<string, LocalizedText> = {
  "1": { en: "Hello world.", ja: "こんにちは世界。" },
  "2": { en: "Hello brave new world.", ja: "こんにちは新しい世界。" },
};

describe("diffVersions", () => {
  it("marks only the newly-added words when versions differ", () => {
    const result = diffVersions(versions, "1", "2", "en");
    expect(result.available).toBe(true);
    const added = result.parts.filter((part) => part.added);
    expect(added.map((part) => part.value).join("")).toContain("brave new ");
    const unchanged = result.parts.filter(
      (part) => !part.added && !part.removed,
    );
    expect(unchanged.map((part) => part.value).join("")).toContain(
      "Hello ",
    );
  });

  it("returns a single unchanged part when from and to are the same version", () => {
    const result = diffVersions(versions, "1", "1", "en");
    expect(result.available).toBe(true);
    expect(result.parts).toEqual([
      { value: versions["1"]!.en, added: false, removed: false },
    ]);
  });

  it("reports unavailable for an unknown from version", () => {
    const result = diffVersions(versions, "99", "2", "en");
    expect(result).toEqual({
      fromVersion: "99",
      toVersion: "2",
      available: false,
      parts: [],
    });
  });

  it("reports unavailable for an unknown to version", () => {
    const result = diffVersions(versions, "1", "99", "en");
    expect(result.available).toBe(false);
  });
});
