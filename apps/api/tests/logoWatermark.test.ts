import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTestEnv } from "./helpers/env.ts";
import { getLogoWatermark } from "../src/services/logoWatermark.ts";

describe("getLogoWatermark", () => {
  it("returns undefined when LOGO_PATH is unset", () => {
    expect(getLogoWatermark(buildTestEnv({ LOGO_PATH: undefined }))).toBe(
      undefined,
    );
  });

  it("returns undefined when the configured file can't be read", () => {
    expect(
      getLogoWatermark(buildTestEnv({ LOGO_PATH: "/no/such/file.png" })),
    ).toBe(undefined);
  });

  it("reads and returns the file at LOGO_PATH", () => {
    const dir = mkdtempSync(join(tmpdir(), "openmiq-logo-watermark-test-"));
    const logoPath = join(dir, "logo.png");
    const marker = Buffer.from("not-a-real-png-but-good-enough-to-test");
    writeFileSync(logoPath, marker);

    const result = getLogoWatermark(buildTestEnv({ LOGO_PATH: logoPath }));
    expect(result?.equals(marker)).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});
