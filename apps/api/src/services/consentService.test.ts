import { describe, expect, it } from "vitest";
import { createTestDb } from "@openmiq/db/testDb";
import { users } from "@openmiq/db";
import { eq } from "drizzle-orm";
import { needsReconsent, recordConsent } from "./consentService.ts";
import { buildTestEnv } from "../../tests/helpers/env.ts";

describe("needsReconsent", () => {
  const env = buildTestEnv({ TERMS_VERSION: "2", PRIVACY_VERSION: "1" });

  it("is true when the user's agreed terms version is behind", () => {
    expect(
      needsReconsent(env, {
        agreedTermsVersion: "1",
        agreedPrivacyVersion: "1",
      }),
    ).toBe(true);
  });

  it("is true when the user has never agreed to anything", () => {
    expect(
      needsReconsent(env, {
        agreedTermsVersion: null,
        agreedPrivacyVersion: null,
      }),
    ).toBe(true);
  });

  it("is false once both versions match", () => {
    expect(
      needsReconsent(env, {
        agreedTermsVersion: "2",
        agreedPrivacyVersion: "1",
      }),
    ).toBe(false);
  });
});

describe("recordConsent", () => {
  it("updates the user's agreed versions and timestamp", async () => {
    const db = createTestDb();
    await db.insert(users).values({
      id: "user-1",
      discordId: "d1",
      discordUsername: "alice",
      email: "alice@example.com",
      status: "approved",
      agreedTermsVersion: "1",
      agreedPrivacyVersion: "1",
    });

    await recordConsent(db, "user-1", "2", "2");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, "user-1"));
    expect(user?.agreedTermsVersion).toBe("2");
    expect(user?.agreedPrivacyVersion).toBe("2");
    expect(user?.agreedAt).toBeInstanceOf(Date);
  });
});
