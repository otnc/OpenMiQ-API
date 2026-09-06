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

const { renderQuote, renderFakeQuote } =
  await import("../src/services/renderService.ts");
const { getLogoWatermark } = await import("../src/services/logoWatermark.ts");

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

  it("draws watermarkUrl as an image, overriding text watermark", async () => {
    await renderQuote(
      {
        ...baseInput,
        watermark: "ignored text",
        watermarkUrl: "https://example.com/logo.png",
      },
      buildTestEnv(),
    );
    expect(setWatermark).toHaveBeenCalledWith(
      new URL("https://example.com/logo.png"),
    );
  });
});

describe("renderQuote display name / username", () => {
  beforeEach(() => {
    miqInstance.setDisplayName.mockClear();
    miqInstance.setUsername.mockClear();
  });

  it("uses authorName for both the display name and username lines when authorUsername is omitted", async () => {
    await renderQuote(baseInput, buildTestEnv());
    expect(miqInstance.setDisplayName).toHaveBeenCalledWith("alice");
    expect(miqInstance.setUsername).toHaveBeenCalledWith("alice");
  });

  it("uses authorUsername for the username line when given", async () => {
    await renderQuote(
      { ...baseInput, authorUsername: "alice123" },
      buildTestEnv(),
    );
    expect(miqInstance.setDisplayName).toHaveBeenCalledWith("alice");
    expect(miqInstance.setUsername).toHaveBeenCalledWith("alice123");
  });
});

describe("renderFakeQuote display name / username", () => {
  beforeEach(() => {
    miqInstance.setDisplayName.mockClear();
    miqInstance.setUsername.mockClear();
  });

  it("prefixes the display name with '(fake) ' but leaves the username line as authorName when authorUsername is omitted", async () => {
    await renderFakeQuote(baseInput, buildTestEnv());
    expect(miqInstance.setDisplayName).toHaveBeenCalledWith("(fake) alice");
    expect(miqInstance.setUsername).toHaveBeenCalledWith("alice");
  });

  it("still uses authorUsername for the username line when given, unprefixed", async () => {
    await renderFakeQuote(
      { ...baseInput, authorUsername: "alice123" },
      buildTestEnv(),
    );
    expect(miqInstance.setDisplayName).toHaveBeenCalledWith("(fake) alice");
    expect(miqInstance.setUsername).toHaveBeenCalledWith("alice123");
  });
});

describe("renderQuote avatar", () => {
  beforeEach(() => {
    miqInstance.setAvatar.mockClear();
  });

  it("passes authorAvatarUrl straight through", async () => {
    await renderQuote(
      { ...baseInput, authorAvatarUrl: "https://example.com/a.png" },
      buildTestEnv(),
    );
    expect(miqInstance.setAvatar).toHaveBeenCalledWith(
      "https://example.com/a.png",
    );
  });
});
