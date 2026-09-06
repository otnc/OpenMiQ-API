import { and, eq, isNotNull, lt } from "drizzle-orm";
import { hostedImages, type Db } from "@openmiq/db";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { createImageStore, type ImageStore } from "./imageStore/index.ts";

const CLEANUP_INTERVAL_MS = 15 * 60_000;

// hostedImages.expiresAt only ever gated GET /api/images/:id's 404 check — imageStore.delete() existed on both drivers but nothing ever called it, so an expired row's actual file sat in storage (R2 or local disk) forever. This finds every row whose expiresAt has passed, deletes the underlying object, then removes the row, so an expiry (HOSTED_IMAGE_TTL_HOURS or UPLOAD_TTL_HOURS) is an actual deletion, not just a 404.
export async function cleanupExpiredHostedImages(
  db: Db,
  imageStore: ImageStore,
): Promise<number> {
  const expired = await db
    .select({ id: hostedImages.id })
    .from(hostedImages)
    .where(
      and(
        isNotNull(hostedImages.expiresAt),
        lt(hostedImages.expiresAt, new Date()),
      ),
    );
  for (const row of expired) {
    await imageStore.delete(row.id);
    await db.delete(hostedImages).where(eq(hostedImages.id, row.id));
  }
  return expired.length;
}

/** Starts the recurring cleanup sweep. Call once at process startup (index.ts), not from createApp() itself, so tests constructing an app via createApp() don't each spin up a background timer. */
export function startHostedImageCleanup(env: Env): void {
  const db = getDb(env);
  const imageStore = createImageStore(env);
  const run = () => {
    void cleanupExpiredHostedImages(db, imageStore).catch((error) => {
      console.error("hostedImageCleanupService: sweep failed", error);
    });
  };
  run();
  const timer = setInterval(run, CLEANUP_INTERVAL_MS);
  timer.unref();
}
