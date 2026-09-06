import { eq } from "drizzle-orm";
import { users, type Db } from "@openmiq/db";
import type { Env } from "../config/env.ts";
import { newId } from "../lib/ids.ts";
import { createApiKey, deleteAllApiKeysAsAdmin } from "./apiKeyService.ts";

// This user only exists to own the rotating shared key below — it never signs in, submits an application, or is visible anywhere in the Admin UI (it has no application row, so it never shows up in the pending/users lists there either).
const SYSTEM_DISCORD_ID = "system:playground-shared";

async function ensureSystemUser(db: Db, env: Env): Promise<string> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.discordId, SYSTEM_DISCORD_ID))
    .limit(1);
  if (existing[0]) {
    // Keep this in sync every rotation so a later TERMS_VERSION/PRIVACY_VERSION bump can't freeze the shared key with reconsent_required — there's no human on the other end to click "re-agree".
    await db
      .update(users)
      .set({
        agreedTermsVersion: env.TERMS_VERSION,
        agreedPrivacyVersion: env.PRIVACY_VERSION,
      })
      .where(eq(users.id, existing[0].id));
    return existing[0].id;
  }

  const id = newId();
  await db.insert(users).values({
    id,
    discordId: SYSTEM_DISCORD_ID,
    discordUsername: "playground-shared-key",
    email: "playground-shared-key@invalid",
    status: "approved",
    agreedTermsVersion: env.TERMS_VERSION,
    agreedPrivacyVersion: env.PRIVACY_VERSION,
  });
  return id;
}

export interface PlaygroundKeyManager {
  /** The current plaintext key, or null if disabled or not rotated yet. */
  getCurrentKey(): string | null;
  /** The current key's row id — changes on every rotate(), so a rate-limit bucket keyed by it naturally starts fresh each rotation instead of carrying a stale count into the new key. Null under the same conditions as getCurrentKey(). */
  getCurrentKeyId(): string | null;
  /** Deletes whatever key this manager last issued and issues a fresh one. */
  rotate(): Promise<void>;
}

/**
 * Owns the lifecycle of /playground's shared demo key: PLAYGROUND_SHARED_KEY_LIMIT === 0 makes every method here a no-op (getCurrentKey() always returns null, so createPlaygroundApp's routes never even get registered).
 * Otherwise, `rotate()` deletes the previous rotation's key (if any) and issues a brand new one against a dedicated internal user (see ensureSystemUser above) — this is a real, ordinary API key in every other respect, so it's rate-limited, revocable and visible the same way any other key is, just not attached to a real Discord account and not something any config file ever names directly.
 */
export function createPlaygroundKeyManager(
  db: Db,
  env: Env,
): PlaygroundKeyManager {
  let currentKey: string | null = null;
  let currentKeyId: string | null = null;

  if (env.PLAYGROUND_SHARED_KEY_LIMIT <= 0) {
    return {
      getCurrentKey: () => null,
      getCurrentKeyId: () => null,
      rotate: async () => {},
    };
  }

  return {
    getCurrentKey: () => currentKey,
    getCurrentKeyId: () => currentKeyId,
    async rotate() {
      const userId = await ensureSystemUser(db, env);
      await deleteAllApiKeysAsAdmin(db, userId);
      const created = await createApiKey(
        db,
        userId,
        { name: `shared-${new Date().toISOString()}`, expiresAt: null },
        1,
      );
      if (typeof created === "string") {
        throw new Error(
          `playgroundKeyService: unexpected "${created}" creating the shared key`,
        );
      }
      currentKey = created.plaintext;
      currentKeyId = created.id;
    },
  };
}

/** Starts the recurring rotation on the interval PLAYGROUND_SHARED_KEY_ROTATE_MINUTES names — a no-op when the feature is disabled. Call once at process startup (index.ts), not from createApp() itself, so tests constructing an app via createApp() don't each spin up a background timer. */
export function startPlaygroundKeyRotation(
  manager: PlaygroundKeyManager,
  env: Env,
): void {
  if (env.PLAYGROUND_SHARED_KEY_LIMIT <= 0) return;
  void manager.rotate();
  const timer = setInterval(
    () => void manager.rotate(),
    env.PLAYGROUND_SHARED_KEY_ROTATE_MINUTES * 60_000,
  );
  timer.unref();
}
