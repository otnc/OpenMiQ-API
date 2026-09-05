import { ofetch, type FetchOptions } from "ofetch";
import type { Env } from "../config/env.ts";

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  fields: DiscordEmbedField[];
  timestamp?: string;
  footer?: { text: string };
}

interface DiscordButton {
  type: 2;
  style: 3 | 4;
  label: string;
  custom_id: string;
  disabled?: boolean;
}

interface DiscordActionRow {
  type: 1;
  components: DiscordButton[];
}

export interface SentDiscordMessage {
  id: string;
  channelId: string;
}

const MAX_RETRIES = 2;

// A Discord webhook URL embeds its secret token in the path
// (.../webhooks/<id>/<token>/...). ofetch's own error puts the full request
// URL in `.message` (and Node's console.error prints an Error's message and
// stack), so anything caught here must be re-thrown without that token
// before it can reach a log line — never rethrow the original error as-is.
async function requestWithRetry<T>(
  url: string,
  options: FetchOptions<"json">,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await ofetch<T>(url, options);
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      const retryAfterHeader = (
        error as { response?: { headers?: Headers } }
      ).response?.headers?.get("Retry-After");
      if (status === 429 && attempt < MAX_RETRIES) {
        attempt++;
        const retryAfterSeconds = retryAfterHeader
          ? Number(retryAfterHeader)
          : 1;
        await new Promise((resolve) =>
          setTimeout(resolve, retryAfterSeconds * 1000),
        );
        continue;
      }
      // No `cause: error` here (despite preserve-caught-error) — the
      // original error's message/URL is exactly what must not reach a log
      // line, and Node's console.error prints an Error's `.cause` too.
      // eslint-disable-next-line preserve-caught-error
      throw new Error(
        `Discord webhook request failed${status ? ` (status ${status})` : ""}`,
      );
    }
  }
}

interface ReviewParams {
  discordUsername: string;
  discordId: string;
  email: string;
  ip: string;
  fingerprint: string;
  message: string;
}

function reviewEmbed(params: ReviewParams, footer?: string): DiscordEmbed {
  return {
    title: "New API Console application",
    fields: [
      {
        name: "Discord user",
        value: `${params.discordUsername} (id: ${params.discordId})`,
      },
      { name: "Email", value: params.email },
      { name: "IP address", value: params.ip },
      { name: "Fingerprint", value: params.fingerprint },
      { name: "Application text", value: `\`\`\`\n${params.message}\n\`\`\`` },
    ],
    timestamp: new Date().toISOString(),
    ...(footer ? { footer: { text: footer } } : {}),
  };
}

function reviewButtons(
  applicationId: string,
  disabled = false,
): DiscordActionRow[] {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: "Approve",
          custom_id: `app_approve:${applicationId}`,
          disabled,
        },
        {
          type: 2,
          style: 4,
          label: "Deny",
          custom_id: `app_deny:${applicationId}`,
          disabled,
        },
      ],
    },
  ];
}

export async function sendReviewMessage(
  env: Env,
  applicationId: string,
  params: ReviewParams,
): Promise<SentDiscordMessage> {
  const response = await requestWithRetry<{ id: string; channel_id: string }>(
    `${env.DISCORD_REVIEW_WEBHOOK_URL}?wait=true`,
    {
      method: "POST",
      body: {
        embeds: [reviewEmbed(params)],
        components: reviewButtons(applicationId),
      },
    },
  );
  return { id: response.id, channelId: response.channel_id };
}

export async function disableReviewButtons(
  env: Env,
  messageId: string,
  applicationId: string,
  params: ReviewParams,
  footer: string,
): Promise<void> {
  await requestWithRetry(
    `${env.DISCORD_REVIEW_WEBHOOK_URL}/messages/${messageId}`,
    {
      method: "PATCH",
      body: {
        embeds: [reviewEmbed(params, footer)],
        components: reviewButtons(applicationId, true),
      },
    },
  );
}
