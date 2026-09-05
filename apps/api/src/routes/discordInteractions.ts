import { Hono } from "hono";
import {
  verifyKey,
  InteractionType,
  InteractionResponseType,
} from "discord-interactions";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import {
  reviewApplication,
  notifyReviewResult,
  type ReviewAction,
} from "../services/applicationService.ts";

interface MessageComponentInteraction {
  type: number;
  member?: { user?: { id?: string } };
  user?: { id?: string };
  data?: { custom_id?: string };
}

function ephemeral(content: string) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: 64 },
  };
}

export function createDiscordInteractionsApp(env: Env) {
  const app = new Hono();
  const db = getDb(env);
  const adminIds = new Set(env.ADMIN_DISCORD_IDS);

  app.post("/api/discord/interactions", async (c) => {
    const signature = c.req.header("X-Signature-Ed25519");
    const timestamp = c.req.header("X-Signature-Timestamp");
    const rawBody = await c.req.text();

    if (!signature || !timestamp) {
      return c.text("Missing signature headers", 401);
    }
    const isValid = await verifyKey(
      rawBody,
      signature,
      timestamp,
      env.DISCORD_PUBLIC_KEY,
    );
    if (!isValid) {
      return c.text("Invalid request signature", 401);
    }

    const interaction = JSON.parse(rawBody) as MessageComponentInteraction;

    if (interaction.type === InteractionType.PING) {
      return c.json({ type: InteractionResponseType.PONG });
    }

    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const customId = interaction.data?.custom_id ?? "";
      const [prefix, applicationId] = customId.split(":");
      if (
        (prefix !== "app_approve" && prefix !== "app_deny") ||
        !applicationId
      ) {
        return c.json(ephemeral("Unknown interaction."));
      }

      const actorId = interaction.member?.user?.id ?? interaction.user?.id;
      if (!actorId || !adminIds.has(actorId)) {
        return c.json(ephemeral("You don't have permission to do this."));
      }

      const action: ReviewAction =
        prefix === "app_approve" ? "approve" : "deny";
      const result = reviewApplication(db, applicationId, action, actorId);
      if (!result) {
        return c.json(ephemeral("This application no longer exists."));
      }

      // Ack within Discord's 3s window first; the message edit (which can
      // retry on 429, see discordWebhookService) happens after we respond.
      if (!result.alreadyReviewed) {
        notifyReviewResult(env, result, action).catch((error: unknown) => {
          console.error("Failed to update Discord review message", error);
        });
      }

      return c.json({
        type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
      });
    }

    return c.json(ephemeral("Unsupported interaction."));
  });

  return app;
}
