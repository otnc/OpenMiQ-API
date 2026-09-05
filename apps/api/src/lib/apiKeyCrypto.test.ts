import { describe, expect, it } from "vitest";
import { generateApiKeySecret, hashApiKey } from "./apiKeyCrypto.ts";

describe("apiKeyCrypto", () => {
  it("generates a plaintext key with the expected prefix", () => {
    const { plaintext, displayPrefix } = generateApiKeySecret();
    expect(plaintext).toMatch(/^openmiq_/);
    expect(plaintext.startsWith(displayPrefix)).toBe(true);
    expect(displayPrefix).toHaveLength(12);
  });

  it("generates a different secret every time", () => {
    const a = generateApiKeySecret();
    const b = generateApiKeySecret();
    expect(a.plaintext).not.toBe(b.plaintext);
  });

  it("hashes deterministically so a stored hash can be matched later", () => {
    const { plaintext } = generateApiKeySecret();
    expect(hashApiKey(plaintext)).toBe(hashApiKey(plaintext));
  });

  it("never stores the plaintext key as its own hash", () => {
    const { plaintext } = generateApiKeySecret();
    expect(hashApiKey(plaintext)).not.toBe(plaintext);
  });
});
