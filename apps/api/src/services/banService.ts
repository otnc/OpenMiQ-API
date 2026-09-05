import { or, eq } from "drizzle-orm";
import { bans, type Db } from "@openmiq/db";
import { newId } from "../lib/ids.ts";

export async function isBanned(
  db: Db,
  params: { discordId: string; email: string; ip: string },
): Promise<boolean> {
  const rows = await db
    .select()
    .from(bans)
    .where(
      or(
        eq(bans.discordId, params.discordId),
        eq(bans.email, params.email),
        eq(bans.ip, params.ip),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function createBan(
  db: Db,
  params: {
    discordId: string | null;
    email: string | null;
    ip: string | null;
    reason: string;
    bannedBy: string;
  },
): Promise<string> {
  const id = newId();
  await db.insert(bans).values({ id, ...params });
  return id;
}

export async function listBans(db: Db) {
  return db.select().from(bans);
}

export async function deleteBan(db: Db, id: string): Promise<boolean> {
  const rows = await db.select().from(bans).where(eq(bans.id, id)).limit(1);
  if (!rows[0]) return false;
  await db.delete(bans).where(eq(bans.id, id));
  return true;
}
