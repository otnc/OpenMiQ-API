import { describe, expect, it } from "vitest";
import { createTestDb } from "@openmiq/db/testDb";
import { createBan, deleteBan, isBanned, listBans } from "./banService.ts";

describe("banService", () => {
  it("matches a ban by discordId, email, or ip independently", async () => {
    const db = createTestDb();
    await createBan(db, {
      discordId: "d1",
      email: null,
      ip: null,
      reason: "spam",
      bannedBy: "admin-1",
    });

    expect(
      await isBanned(db, { discordId: "d1", email: "x@x.com", ip: "1.2.3.4" }),
    ).toBe(true);
    expect(
      await isBanned(db, {
        discordId: "other",
        email: "x@x.com",
        ip: "1.2.3.4",
      }),
    ).toBe(false);
  });

  it("is not banned when no ban row matches any field", async () => {
    const db = createTestDb();
    expect(
      await isBanned(db, { discordId: "d1", email: "x@x.com", ip: "1.2.3.4" }),
    ).toBe(false);
  });

  it("deleteBan removes the row and reports whether it existed", async () => {
    const db = createTestDb();
    const id = await createBan(db, {
      discordId: "d1",
      email: null,
      ip: null,
      reason: "spam",
      bannedBy: "admin-1",
    });

    expect(await deleteBan(db, "does-not-exist")).toBe(false);
    expect(await deleteBan(db, id)).toBe(true);
    expect(await listBans(db)).toHaveLength(0);
  });
});
