import { and, desc, eq } from "drizzle-orm";
import { applications, users, adminActions, type Db } from "@openmiq/db";
import type { Env } from "../config/env.ts";
import { newId } from "../lib/ids.ts";
import { isBanned } from "./banService.ts";
import { findUserByDiscordId } from "./userService.ts";
import {
  sendReviewMessage,
  disableReviewButtons,
} from "./discordWebhookService.ts";
import { sendDirectMessage } from "./discordBotService.ts";
import type { SessionIdentity } from "./sessionService.ts";
import type { ApplicationInput } from "@openmiq/shared";

export type ApplyRejection =
  | { reason: "banned" }
  | { reason: "pending_exists" }
  | { reason: "already_approved" }
  | { reason: "cooldown"; daysRemaining: number }
  | { reason: "terms_mismatch" };

export async function checkCanApply(
  db: Db,
  env: Env,
  identity: SessionIdentity,
  ip: string,
): Promise<ApplyRejection | null> {
  if (
    await isBanned(db, {
      discordId: identity.discordId,
      email: identity.email,
      ip,
    })
  ) {
    return { reason: "banned" };
  }

  const user = await findUserByDiscordId(db, identity.discordId);
  if (user?.status === "pending") {
    return { reason: "pending_exists" };
  }

  if (user?.status === "approved") {
    return { reason: "already_approved" };
  }

  if (user?.status === "banned") {
    return { reason: "banned" };
  }

  if (user?.status === "denied" || user?.status === "revoked") {
    const cooldownStart =
      user.status === "denied"
        ? await latestDeniedAt(db, user.id)
        : await latestRevokedAt(db, user.id);
    if (cooldownStart) {
      const cooldownEnds =
        cooldownStart.getTime() +
        env.REAPPLY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      const remainingMs = cooldownEnds - Date.now();
      if (remainingMs > 0) {
        return {
          reason: "cooldown",
          daysRemaining: Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
        };
      }
    }
  }

  return null;
}

async function latestDeniedAt(db: Db, userId: string): Promise<Date | null> {
  const rows = await db
    .select()
    .from(applications)
    .where(
      and(eq(applications.userId, userId), eq(applications.status, "denied")),
    )
    .orderBy(desc(applications.reviewedAt))
    .limit(1);
  return rows[0]?.reviewedAt ?? null;
}

async function latestRevokedAt(db: Db, userId: string): Promise<Date | null> {
  const rows = await db
    .select()
    .from(adminActions)
    .where(
      and(
        eq(adminActions.targetUserId, userId),
        eq(adminActions.action, "revoke"),
      ),
    )
    .orderBy(desc(adminActions.createdAt))
    .limit(1);
  return rows[0]?.createdAt ?? null;
}

export async function submitApplication(
  db: Db,
  env: Env,
  identity: SessionIdentity,
  input: ApplicationInput,
  ip: string,
): Promise<void> {
  let user = await findUserByDiscordId(db, identity.discordId);
  if (!user) {
    const userId = newId();
    await db.insert(users).values({
      id: userId,
      discordId: identity.discordId,
      discordUsername: identity.discordUsername,
      email: identity.email,
      status: "pending",
      agreedTermsVersion: input.agreedTermsVersion,
      agreedPrivacyVersion: input.agreedPrivacyVersion,
      agreedAt: new Date(),
    });
    user = await findUserByDiscordId(db, identity.discordId);
  } else {
    await db
      .update(users)
      .set({
        status: "pending",
        discordUsername: identity.discordUsername,
        email: identity.email,
        agreedTermsVersion: input.agreedTermsVersion,
        agreedPrivacyVersion: input.agreedPrivacyVersion,
        agreedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }
  if (!user) throw new Error("Failed to create or load user");

  const applicationId = newId();
  await db.insert(applications).values({
    id: applicationId,
    userId: user.id,
    message: input.message,
    ip,
    fingerprint: input.fingerprint,
    status: "pending",
    agreedTermsVersion: input.agreedTermsVersion,
    agreedPrivacyVersion: input.agreedPrivacyVersion,
    agreedAt: new Date(),
  });

  const sent = await sendReviewMessage(env, applicationId, {
    discordUsername: identity.discordUsername,
    discordId: identity.discordId,
    email: identity.email,
    ip,
    fingerprint: input.fingerprint,
    message: input.message,
  });

  await db
    .update(applications)
    .set({ discordMessageId: sent.id, discordChannelId: sent.channelId })
    .where(eq(applications.id, applicationId));
}

export type ReviewAction = "approve" | "deny";

export interface ReviewResult {
  application: typeof applications.$inferSelect;
  user: typeof users.$inferSelect;
  alreadyReviewed: boolean;
}

// Applies the admin's decision inside a single transaction so a duplicate button press (or a race between the web UI and Discord) only ever takes effect once (DESIGN.md §6.2).
export function reviewApplication(
  db: Db,
  applicationId: string,
  action: ReviewAction,
  adminDiscordId: string,
): ReviewResult | null {
  return db.transaction((tx) => {
    const application = tx
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .get();
    if (!application) return null;

    const user = tx
      .select()
      .from(users)
      .where(eq(users.id, application.userId))
      .get();
    if (!user) return null;

    if (application.status !== "pending") {
      return { application, user, alreadyReviewed: true };
    }

    const newStatus = action === "approve" ? "approved" : "denied";
    const now = new Date();

    tx.update(applications)
      .set({ status: newStatus, reviewedBy: adminDiscordId, reviewedAt: now })
      .where(eq(applications.id, applicationId))
      .run();

    tx.update(users)
      .set({ status: newStatus })
      .where(eq(users.id, user.id))
      .run();

    tx.insert(adminActions)
      .values({
        id: newId(),
        actorDiscordId: adminDiscordId,
        action: action === "approve" ? "approve" : "deny",
        targetUserId: user.id,
      })
      .run();

    return {
      application: {
        ...application,
        status: newStatus,
        reviewedBy: adminDiscordId,
        reviewedAt: now,
      },
      user: { ...user, status: newStatus },
      alreadyReviewed: false,
    };
  });
}

export async function notifyReviewResult(
  env: Env,
  result: ReviewResult,
  action: ReviewAction,
): Promise<void> {
  const dmContent =
    action === "approve"
      ? `Your OpenMiQ-API application has been approved! You can create API keys at ${env.APP_BASE_URL}/console/api-keys.`
      : `Your OpenMiQ-API application has been denied. You can re-apply after the cooldown period at ${env.APP_BASE_URL}/console/apply.`;
  await sendDirectMessage(
    env.DISCORD_BOT_TOKEN,
    result.user.discordId,
    dmContent,
  );

  if (!result.application.discordMessageId) return;
  const footer = `${action === "approve" ? "Approved" : "Denied"} by ${result.application.reviewedBy ?? "unknown"} at ${(result.application.reviewedAt ?? new Date()).toISOString()}`;
  await disableReviewButtons(
    env,
    result.application.discordMessageId,
    result.application.id,
    {
      discordUsername: result.user.discordUsername,
      discordId: result.user.discordId,
      email: result.user.email,
      ip: result.application.ip,
      fingerprint: result.application.fingerprint,
      message: result.application.message,
    },
    footer,
  );
}
