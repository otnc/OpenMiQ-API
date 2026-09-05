import { describe, expect, it } from "vitest";
import { createTestDb } from "@openmiq/db/testDb";
import { checkAndIncrement, peek } from "./rateLimiter.ts";

describe("rateLimiter", () => {
  it("allows requests up to the max and then blocks", () => {
    const db = createTestDb();
    const key = "test:key";
    for (let i = 0; i < 3; i++) {
      const result = checkAndIncrement(db, key, 60_000, 3);
      expect(result.allowed).toBe(true);
    }
    const blocked = checkAndIncrement(db, key, 60_000, 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks separate counters per key", () => {
    const db = createTestDb();
    checkAndIncrement(db, "a", 60_000, 1);
    const b = checkAndIncrement(db, "b", 60_000, 1);
    expect(b.allowed).toBe(true);
    expect(b.remaining).toBe(0);
  });

  it("peek reports the current count without consuming it", () => {
    const db = createTestDb();
    const key = "peek:key";
    checkAndIncrement(db, key, 60_000, 5);
    const before = peek(db, key, 60_000, 5);
    expect(before.remaining).toBe(4);
    const after = peek(db, key, 60_000, 5);
    expect(after.remaining).toBe(4);
  });

  it("peek on an untouched key reports the full limit available", () => {
    const db = createTestDb();
    const result = peek(db, "never:used", 60_000, 10);
    expect(result.remaining).toBe(10);
    expect(result.allowed).toBe(true);
  });
});
