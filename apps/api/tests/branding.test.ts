import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTestEnv } from "./helpers/env.ts";
import { createTestDbFile } from "./helpers/testDbFile.ts";
import { createApp } from "../src/app.ts";

describe("branding endpoints", () => {
  const { url: DATABASE_URL } = createTestDbFile();

  it("falls back to the bundled icon/logo when ICON_PATH/LOGO_PATH are unset", async () => {
    const app = createApp(buildTestEnv({ DATABASE_URL }));
    const iconRes = await app.request("/api/branding/icon");
    expect(iconRes.status).toBe(200);
    expect(iconRes.headers.get("Content-Type")).toBe("image/png");

    const logoRes = await app.request("/api/branding/logo");
    expect(logoRes.status).toBe(200);
    expect(logoRes.headers.get("Content-Type")).toBe("image/png");
  });

  it("serves the file at ICON_PATH when it's set, with a matching Content-Type", async () => {
    const dir = mkdtempSync(join(tmpdir(), "openmiq-branding-test-"));
    const customIconPath = join(dir, "custom-icon.jpg");
    const marker = Buffer.from("not-a-real-jpeg-but-good-enough-to-test");
    writeFileSync(customIconPath, marker);

    const app = createApp(
      buildTestEnv({ DATABASE_URL, ICON_PATH: customIconPath }),
    );
    const res = await app.request("/api/branding/icon");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.equals(marker)).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});
