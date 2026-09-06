import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// STORAGE_DRIVER=local's default STORAGE_LOCAL_DIR ("./data/images") is a real path relative to apps/api's cwd — without this, tests that actually PUT a file (uploads.test.ts, hostedImageCleanupService.test.ts) would write real orphaned files into the project's own data/images directory instead of a throwaway one.
export function createTestImageDir(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "openmiq-api-test-images-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
