import { afterAll, describe, expect, it } from "vitest";
import { hostedImages } from "@openmiq/db";
import { cleanupExpiredHostedImages } from "../src/services/hostedImageCleanupService.ts";
import { createImageStore } from "../src/services/imageStore/index.ts";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";
import { createTestImageDir } from "./helpers/testImageDir.ts";
import { getDb } from "../src/db.ts";

describe("cleanupExpiredHostedImages", () => {
  const { url: DATABASE_URL, cleanup: cleanupDb } = createTestDbFile();
  const { dir: STORAGE_LOCAL_DIR, cleanup: cleanupImages } =
    createTestImageDir();
  const env = buildTestEnv({ DATABASE_URL, STORAGE_LOCAL_DIR });
  const db = getDb(env);
  const imageStore = createImageStore(env);
  afterAll(() => {
    cleanupDb();
    cleanupImages();
  });

  it("deletes both the row and the stored file for an expired image, and leaves everything else alone", async () => {
    const expiredId = "expired-image";
    const futureId = "future-image";
    const foreverId = "forever-image";
    for (const id of [expiredId, futureId, foreverId]) {
      await imageStore.put(id, Buffer.from(`bytes-${id}`));
    }
    await db.insert(hostedImages).values([
      { id: expiredId, expiresAt: new Date(Date.now() - 60_000) },
      { id: futureId, expiresAt: new Date(Date.now() + 60 * 60_000) },
      { id: foreverId, expiresAt: null },
    ]);

    const deleted = await cleanupExpiredHostedImages(db, imageStore);
    expect(deleted).toBe(1);

    expect(await imageStore.get(expiredId)).toBeNull();
    expect(await imageStore.get(futureId)).not.toBeNull();
    expect(await imageStore.get(foreverId)).not.toBeNull();

    const rows = await db.select().from(hostedImages);
    const ids = rows.map((row) => row.id);
    expect(ids).not.toContain(expiredId);
    expect(ids).toContain(futureId);
    expect(ids).toContain(foreverId);
  });

  it("is a no-op when nothing is expired", async () => {
    const deleted = await cleanupExpiredHostedImages(db, imageStore);
    expect(deleted).toBe(0);
  });
});
