import { eq } from "drizzle-orm";
import { users, type Db } from "@openmiq-api/db";
import type { SessionIdentity } from "./sessionService.ts";

export async function findUserByDiscordId(db: Db, discordId: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.discordId, discordId))
    .limit(1);
  return rows[0] ?? null;
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
