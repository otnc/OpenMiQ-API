import { afterEach, describe, expect, it, vi } from "vitest";
import { sendReviewMessage } from "./discordWebhookService.ts";
import type { Env } from "../config/env.ts";

const WEBHOOK_SECRET = "SUPER_SECRET_WEBHOOK_TOKEN";
const env = {
  DISCORD_REVIEW_WEBHOOK_URL: `https://discord.test/api/webhooks/123/${WEBHOOK_SECRET}`,
} as Env;

const reviewParams = {
  discordUsername: "alice",
  discordId: "d1",
  email: "alice@example.com",
  ip: "1.2.3.4",
  fingerprint: "fp1",
  message: "please let me in",
};

describe("discordWebhookService error handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never lets the webhook's secret token reach a thrown error's message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );

    await expect(
      sendReviewMessage(env, "app-1", reviewParams),
    ).rejects.toThrow();

    try {
      await sendReviewMessage(env, "app-1", reviewParams);
      expect.unreachable();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain(WEBHOOK_SECRET);
      expect(message).toBe("Discord webhook request failed");
    }
  });

  it("includes the HTTP status in the sanitized error when available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "not found" }), {
          status: 404,
        }),
      ),
    );

    try {
      await sendReviewMessage(env, "app-1", reviewParams);
      expect.unreachable();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain(WEBHOOK_SECRET);
      expect(message).toBe("Discord webhook request failed (status 404)");
    }
  });
});
