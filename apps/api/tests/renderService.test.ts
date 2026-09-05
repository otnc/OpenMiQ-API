import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuoteRequest } from "@openmiq/shared";
import { buildTestEnv } from "./helpers/env.ts";

const setWatermark = vi.fn();
const miqInstance = {
  setText: vi.fn().mockReturnThis(),
  setUsername: vi.fn().mockReturnThis(),
  setDisplayName: vi.fn().mockReturnThis(),
  setAvatar: vi.fn().mockReturnThis(),
  setTheme: vi.fn().mockReturnThis(),
  setWatermark,
  toBuffer: vi.fn().mockResolvedValue(Buffer.from("png")),
};

vi.mock("makeitaquote", () => ({
  MiQ: vi.fn().mockImplementation(function MiQ() {
    return miqInstance;
  }),
}));

vi.mock("../src/services/logoWatermark.ts", () => ({
  getLogoWatermark: vi.fn(),
}));

const { renderQuote } = await import("../src/services/renderService.ts");
const { getLogoWatermark } = await import(
  "../src/services/logoWatermark.ts"
);

const baseInput: QuoteRequest = {
  authorName: "alice",
  text: "hi",
};

describe("renderQuote watermark precedence", () => {
  beforeEach(() => {
    setWatermark.mockClear();
    vi.mocked(getLogoWatermark).mockReset();
  });

  it("does not set a watermark when there is no logo and no override", async () => {
    vi.mocked(getLogoWatermark).mockReturnValue(undefined);
    await renderQuote(baseInput, buildTestEnv());
    expect(setWatermark).not.toHaveBeenCalled();
  });

  it("defaults to the LOGO_PATH image when configured", async () => {
    const logo = Buffer.from("logo-bytes");
    vi.mocked(getLogoWatermark).mockReturnValue(logo);
    await renderQuote(baseInput, buildTestEnv({ LOGO_PATH: "logo.png" }));
    expect(setWatermark).toHaveBeenCalledWith(logo);
  });

  it("lets the caller's own watermark override the LOGO_PATH default", async () => {
    const logo = Buffer.from("logo-bytes");
    vi.mocked(getLogoWatermark).mockReturnValue(logo);
    await renderQuote(
      { ...baseInput, watermark: "custom text" },
      buildTestEnv({ LOGO_PATH: "logo.png" }),
    );
    expect(setWatermark).toHaveBeenCalledWith("custom text");
  });

  it("honors an explicit empty-string override as 'no watermark'", async () => {
    const logo = Buffer.from("logo-bytes");
    vi.mocked(getLogoWatermark).mockReturnValue(logo);
    await renderQuote(
      { ...baseInput, watermark: "" },
      buildTestEnv({ LOGO_PATH: "logo.png" }),
    );
    expect(setWatermark).toHaveBeenCalledWith("");
  });
});
