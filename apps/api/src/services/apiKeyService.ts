import { and, eq, isNull, sql } from "drizzle-orm";
import { apiKeys, users, type Db } from "@openmiq/db";
import { newId } from "../lib/ids.ts";
import { hashApiKey, generateApiKeySecret } from "../lib/apiKeyCrypto.ts";
import type { CreateApiKeyInput, UpdateApiKeyInput } from "@openmiq/shared";

export type CreateApiKeyError = "limit_reached";

export async function countActiveApiKeys(
  db: Db,
  userId: string,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));
  return rows[0]?.count ?? 0;
}

export async function effectiveApiKeyLimit(
  db: Db,
  userId: string,
  globalDefault: number,
): Promise<number> {
  const rows = await db
    .select({ maxApiKeys: users.maxApiKeys })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.maxApiKeys ?? globalDefault;
}

export async function createApiKey(
  db: Db,
  userId: string,
  input: CreateApiKeyInput,
  globalDefaultLimit: number,
): Promise<{ id: string; plaintext: string } | CreateApiKeyError> {
  const [count, limit] = await Promise.all([
    countActiveApiKeys(db, userId),
    effectiveApiKeyLimit(db, userId, globalDefaultLimit),
  ]);
  if (count >= limit) return "limit_reached";

  const { plaintext, displayPrefix } = generateApiKeySecret();
  const id = newId();
  await db.insert(apiKeys).values({
    id,
    userId,
    name: input.name,
    keyHash: hashApiKey(plaintext),
    keyPrefix: displayPrefix,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
  });
  return { id, plaintext };
}

export async function listApiKeys(db: Db, userId: string) {
  return db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function findApiKeyForUser(db: Db, id: string, userId: string) {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateApiKey(
  db: Db,
  id: string,
  userId: string,
  input: UpdateApiKeyInput,
): Promise<boolean> {
  const key = await findApiKeyForUser(db, id, userId);
  if (!key) return false;
  await db
    .update(apiKeys)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
        : {}),
    })
    .where(eq(apiKeys.id, id));
  return true;
}

export async function regenerateApiKey(
  db: Db,
  id: string,
  userId: string,
): Promise<string | null> {
  const key = await findApiKeyForUser(db, id, userId);
  if (!key) return null;
  const { plaintext, displayPrefix } = generateApiKeySecret();
  await db
    .update(apiKeys)
    .set({ keyHash: hashApiKey(plaintext), keyPrefix: displayPrefix })
    .where(eq(apiKeys.id, id));
  return plaintext;
}

export async function deleteApiKey(
  db: Db,
  id: string,
  userId: string,
): Promise<boolean> {
  const key = await findApiKeyForUser(db, id, userId);
  if (!key) return false;
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  return true;
}

export async function deleteAllApiKeys(db: Db, userId: string): Promise<void> {
  await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function revokeApiKeyAsAdmin(
  db: Db,
  id: string,
  adminDiscordId: string,
): Promise<boolean> {
  const result = await db
    .update(apiKeys)
    .set({ revokedAt: new Date(), revokedBy: `admin:${adminDiscordId}` })
    .where(eq(apiKeys.id, id));
  return (result.changes ?? 0) > 0;
}

export async function deleteApiKeyAsAdmin(db: Db, id: string): Promise<void> {
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
}

export async function deleteAllApiKeysAsAdmin(
  db: Db,
  userId: string,
): Promise<void> {
  await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
}
