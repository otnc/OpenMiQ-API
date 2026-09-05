import { or, eq } from "drizzle-orm";
import { bans, type Db } from "@openmiq/db";

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
