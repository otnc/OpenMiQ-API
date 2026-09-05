import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";
import {
  generateDiscordKeyPair,
  signInteraction,
} from "./helpers/discordSignature.ts";
import type { SessionIdentity } from "../src/services/sessionService.ts";

vi.mock("../src/services/discordWebhookService.ts", () => ({
  sendReviewMessage: vi
    .fn()
    .mockResolvedValue({ id: "msg-1", channelId: "chan-1" }),
  disableReviewButtons: vi.fn().mockResolvedValue(undefined),
}));

const { createApp } = await import("../src/app.ts");
const { getDb } = await import("../src/db.ts");
const { submitApplication } = await import(
  "../src/services/applicationService.ts"
);

const ADMIN_ID = "admin-1";
const NON_ADMIN_ID = "not-an-admin";

async function postInteraction(
  app: ReturnType<typeof createApp>,
  privateKey: CryptoKey,
  body: unknown,
  overrides: { signature?: string; timestamp?: string } = {},
) {
  const raw = JSON.stringify(body);
  const timestamp = overrides.timestamp ?? String(Math.floor(Date.now() / 1000));
  const signature =
    overrides.signature ?? (await signInteraction(privateKey, timestamp, raw));
  return app.request("/api/discord/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature-Ed25519": signature,
      "X-Signature-Timestamp": timestamp,
    },
    body: raw,
  });
}

async function createPendingApplication(env: ReturnType<typeof buildTestEnv>) {
  const db = getDb(env);
  const identity: SessionIdentity = {
    discordId: `applicant-${crypto.randomUUID()}`,
    discordUsername: "applicant",
    email: "applicant@example.com",
  };
  await submitApplication(
    db,
    env,
    identity,
    {
      message: "Please let me use this API for my project.",
      fingerprint: "fp-1",
      agreedTermsVersion: "1",
      agreedPrivacyVersion: "1",
    },
    "1.2.3.4",
  );
  const { applications } = await import("@openmiq/db");
  const { eq } = await import("drizzle-orm");
  const { findUserByDiscordId } = await import(
    "../src/services/userService.ts"
  );
  const user = await findUserByDiscordId(db, identity.discordId);
  const [row] = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, user!.id));
  return row!;
}

// Interactions are handled by a stateless HTTP endpoint (no Gateway bot, no
// in-memory session tied to a single process) so a button press must work
// correctly against a *freshly built* app instance — exactly what a process
// restart looks like — as long as the underlying database is unchanged.
describe("Discord interactions endpoint", () => {
  let publicKeyHex: string;
  let privateKey: CryptoKey;
  let env: ReturnType<typeof buildTestEnv>;
  let cleanup: () => void;

  beforeAll(async () => {
    const keyPair = await generateDiscordKeyPair();
    publicKeyHex = keyPair.publicKeyHex;
    privateKey = keyPair.privateKey;
    const dbFile = createTestDbFile();
    cleanup = dbFile.cleanup;
    env = buildTestEnv({
      DATABASE_URL: dbFile.url,
      DISCORD_PUBLIC_KEY: publicKeyHex,
      ADMIN_DISCORD_IDS: [ADMIN_ID],
    });
  });

  afterAll(() => cleanup());

  it("responds to PING with PONG", async () => {
    const app = createApp(env);
    const res = await postInteraction(app, privateKey, { type: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ type: 1 });
  });

  it("rejects requests missing signature headers", async () => {
    const app = createApp(env);
    const res = await app.request("/api/discord/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 1 }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid signature", async () => {
    const app = createApp(env);
    const res = await postInteraction(app, privateKey, { type: 1 }, {
      signature: "00".repeat(64),
    });
    expect(res.status).toBe(401);
  });

  it("refuses to approve for a non-admin actor", async () => {
    const app = createApp(env);
    const application = await createPendingApplication(env);
    const res = await postInteraction(app, privateKey, {
      type: 3,
      member: { user: { id: NON_ADMIN_ID } },
      data: { custom_id: `app_approve:${application.id}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.content).toMatch(/don't have permission/);

    const db = getDb(env);
    const { applications } = await import("@openmiq/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, application.id));
    expect(row?.status).toBe("pending");
  });

  it("approves the application when the admin presses the button", async () => {
    const app = createApp(env);
    const application = await createPendingApplication(env);
    const res = await postInteraction(app, privateKey, {
      type: 3,
      member: { user: { id: ADMIN_ID } },
      data: { custom_id: `app_approve:${application.id}` },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).type).toBe(6); // DEFERRED_UPDATE_MESSAGE

    const db = getDb(env);
    const { applications, users } = await import("@openmiq/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, application.id));
    expect(row?.status).toBe("approved");
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, application.userId));
    expect(user?.status).toBe("approved");
  });

  it("still works against a brand new app instance (simulated restart)", async () => {
    const application = await createPendingApplication(env);

    // A fresh createApp(env) call stands in for the process having
    // restarted: nothing from the earlier app instance is reused here.
    const restartedApp = createApp(env);
    const res = await postInteraction(restartedApp, privateKey, {
      type: 3,
      member: { user: { id: ADMIN_ID } },
      data: { custom_id: `app_deny:${application.id}` },
    });
    expect(res.status).toBe(200);

    const db = getDb(env);
    const { applications } = await import("@openmiq/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, application.id));
    expect(row?.status).toBe("denied");
  });

  it("is idempotent when the button is pressed a second time", async () => {
    const app = createApp(env);
    const application = await createPendingApplication(env);
    await postInteraction(app, privateKey, {
      type: 3,
      member: { user: { id: ADMIN_ID } },
      data: { custom_id: `app_approve:${application.id}` },
    });
    const second = await postInteraction(app, privateKey, {
      type: 3,
      member: { user: { id: ADMIN_ID } },
      data: { custom_id: `app_deny:${application.id}` },
    });
    expect(second.status).toBe(200);

    const db = getDb(env);
    const { applications } = await import("@openmiq/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, application.id));
    expect(row?.status).toBe("approved"); // first press wins, not "denied"
  });
});
