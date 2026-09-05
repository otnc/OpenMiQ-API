import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "@openmiq/db/testDb";
import { applications, users } from "@openmiq/db";
import { eq } from "drizzle-orm";
import { buildTestEnv } from "../../tests/helpers/env.ts";
import type { SessionIdentity } from "./sessionService.ts";

vi.mock("./discordWebhookService.ts", () => ({
  sendReviewMessage: vi
    .fn()
    .mockResolvedValue({ id: "msg-1", channelId: "chan-1" }),
  disableReviewButtons: vi.fn().mockResolvedValue(undefined),
}));

const {
  checkCanApply,
  submitApplication,
  reviewApplication,
} = await import("./applicationService.ts");
const { sendReviewMessage } = await import("./discordWebhookService.ts");

const identity: SessionIdentity = {
  discordId: "d1",
  discordUsername: "alice",
  email: "alice@example.com",
};

describe("checkCanApply", () => {
  it("allows a brand new user to apply", async () => {
    const db = createTestDb();
    const env = buildTestEnv();
    expect(await checkCanApply(db, env, identity, "1.2.3.4")).toBeNull();
  });

  it("rejects a banned identity before ever creating a user row", async () => {
    const db = createTestDb();
    const env = buildTestEnv();
    await db.insert(users).values({
      id: "u1",
      discordId: "d1",
      discordUsername: "alice",
      email: "alice@example.com",
      status: "banned",
    });
    expect(await checkCanApply(db, env, identity, "1.2.3.4")).toEqual({
      reason: "banned",
    });
  });

  it("rejects a second application while one is already pending", async () => {
    const db = createTestDb();
    const env = buildTestEnv();
    await submitApplication(
      db,
      env,
      identity,
      {
        message: "x".repeat(20),
        fingerprint: "fp1",
        agreedTermsVersion: "1",
        agreedPrivacyVersion: "1",
      },
      "1.2.3.4",
    );
    expect(await checkCanApply(db, env, identity, "1.2.3.4")).toEqual({
      reason: "pending_exists",
    });
  });

  it("rejects an already-approved user", async () => {
    const db = createTestDb();
    const env = buildTestEnv();
    await db.insert(users).values({
      id: "u1",
      discordId: "d1",
      discordUsername: "alice",
      email: "alice@example.com",
      status: "approved",
    });
    expect(await checkCanApply(db, env, identity, "1.2.3.4")).toEqual({
      reason: "already_approved",
    });
  });

  it("enforces the reapply cooldown after a denial", async () => {
    const db = createTestDb();
    const env = buildTestEnv({ REAPPLY_COOLDOWN_DAYS: 1 });
    await db.insert(users).values({
      id: "u1",
      discordId: "d1",
      discordUsername: "alice",
      email: "alice@example.com",
      status: "denied",
    });
    await db.insert(applications).values({
      id: "a1",
      userId: "u1",
      message: "x".repeat(20),
      ip: "1.2.3.4",
      fingerprint: "fp1",
      status: "denied",
      reviewedBy: "admin-1",
      reviewedAt: new Date(),
      agreedTermsVersion: "1",
      agreedPrivacyVersion: "1",
      agreedAt: new Date(),
    });
    const rejection = await checkCanApply(db, env, identity, "1.2.3.4");
    expect(rejection?.reason).toBe("cooldown");
  });
});

describe("submitApplication + reviewApplication", () => {
  it("creates a pending user/application and posts a review message", async () => {
    const db = createTestDb();
    const env = buildTestEnv();

    await submitApplication(
      db,
      env,
      identity,
      {
        message: "Please let me use this API for my project.",
        fingerprint: "fp1",
        agreedTermsVersion: "1",
        agreedPrivacyVersion: "1",
      },
      "1.2.3.4",
    );

    expect(sendReviewMessage).toHaveBeenCalledOnce();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.discordId, "d1"));
    expect(user?.status).toBe("pending");

    const [application] = await db.select().from(applications);
    expect(application?.status).toBe("pending");
    expect(application?.discordMessageId).toBe("msg-1");
  });

  it("approving sets both the application and user to approved, in one transaction", async () => {
    const db = createTestDb();
    const env = buildTestEnv();
    await submitApplication(
      db,
      env,
      identity,
      {
        message: "Please let me use this API for my project.",
        fingerprint: "fp1",
        agreedTermsVersion: "1",
        agreedPrivacyVersion: "1",
      },
      "1.2.3.4",
    );
    const [application] = await db.select().from(applications);

    const result = reviewApplication(db, application!.id, "approve", "admin-1");
    expect(result?.alreadyReviewed).toBe(false);
    expect(result?.application.status).toBe("approved");
    expect(result?.user.status).toBe("approved");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.discordId, "d1"));
    expect(user?.status).toBe("approved");
  });

  it("reviewing twice is idempotent and reports alreadyReviewed", async () => {
    const db = createTestDb();
    const env = buildTestEnv();
    await submitApplication(
      db,
      env,
      identity,
      {
        message: "Please let me use this API for my project.",
        fingerprint: "fp1",
        agreedTermsVersion: "1",
        agreedPrivacyVersion: "1",
      },
      "1.2.3.4",
    );
    const [application] = await db.select().from(applications);

    reviewApplication(db, application!.id, "approve", "admin-1");
    const second = reviewApplication(db, application!.id, "deny", "admin-2");

    expect(second?.alreadyReviewed).toBe(true);
    expect(second?.application.status).toBe("approved");
  });

  it("returns null for an application id that doesn't exist", () => {
    const db = createTestDb();
    expect(reviewApplication(db, "nope", "approve", "admin-1")).toBeNull();
  });
});
