import { desc, eq } from "drizzle-orm";
import { users, applications, adminActions, bans, type Db } from "@openmiq/db";
import { newId } from "../lib/ids.ts";
import { createBan, deleteBan } from "./banService.ts";
import type { SessionIdentity } from "./sessionService.ts";

export async function findUserByDiscordId(db: Db, discordId: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.discordId, discordId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(db: Db, id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listUsers(
  db: Db,
  status?: (typeof users.$inferSelect)["status"],
) {
  return status
    ? db.select().from(users).where(eq(users.status, status))
    : db.select().from(users);
}

async function latestApplicationIp(
  db: Db,
  userId: string,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt))
    .limit(1);
  return rows[0]?.ip ?? null;
}

export async function revokeUser(
  db: Db,
  userId: string,
  adminDiscordId: string,
  reason?: string,
): Promise<boolean> {
  const user = await findUserById(db, userId);
  if (!user) return false;

  await db.update(users).set({ status: "revoked" }).where(eq(users.id, userId));
  await db.insert(adminActions).values({
    id: newId(),
    actorDiscordId: adminDiscordId,
    action: "revoke",
    targetUserId: userId,
    reason,
  });
  return true;
}

export async function banUser(
  db: Db,
  userId: string,
  reason: string,
  adminDiscordId: string,
): Promise<boolean> {
  const user = await findUserById(db, userId);
  if (!user) return false;

  const ip = await latestApplicationIp(db, userId);
  await createBan(db, {
    discordId: user.discordId,
    email: user.email,
    ip,
    reason,
    bannedBy: adminDiscordId,
  });
  await db.update(users).set({ status: "banned" }).where(eq(users.id, userId));
  await db.insert(adminActions).values({
    id: newId(),
    actorDiscordId: adminDiscordId,
    action: "ban",
    targetUserId: userId,
    reason,
  });
  return true;
}

export async function unbanByBanId(
  db: Db,
  banId: string,
  adminDiscordId: string,
): Promise<boolean> {
  const banRows = await db
    .select()
    .from(bans)
    .where(eq(bans.id, banId))
    .limit(1);
  const ban = banRows[0];
  const deleted = await deleteBan(db, banId);
  if (!deleted) return false;

  if (ban?.discordId) {
    const user = await findUserByDiscordId(db, ban.discordId);
    if (user && user.status === "banned") {
      await db
        .update(users)
        .set({ status: "denied" })
        .where(eq(users.id, user.id));
    }
  }

  await db.insert(adminActions).values({
    id: newId(),
    actorDiscordId: adminDiscordId,
    action: "unban",
    targetUserId: ban?.discordId ?? banId,
  });
  return true;
}

export type ConsoleStatus =
  "unlinked" | "pending" | "approved" | "denied" | "revoked" | "banned";

export async function resolveConsoleStatus(
  db: Db,
  identity: SessionIdentity,
): Promise<ConsoleStatus> {
  const user = await findUserByDiscordId(db, identity.discordId);
  return user?.status ?? "unlinked";
}
