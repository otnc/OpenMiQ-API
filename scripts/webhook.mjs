#!/usr/bin/env node
// Creates the review webhook via the bot's own API call (README.md "Discord
// setup" step 5) — NOT the channel's Integrations UI. A webhook created
// through that UI is not "application-owned", and Discord silently drops
// the Approve/Deny buttons from every message sent through it (the embed
// still posts, no error, just no buttons). Only a webhook created this way
// — with the bot's own Authorization header — can carry working buttons.
//
// This only ever prints the result; it never writes to .env itself, so you
// can review the value before deciding where it goes.

// pnpm forwards a literal "--" from `pnpm run webhook -- <id>` through to
// this script's own argv instead of stripping it, so it has to be filtered
// out here rather than just reading argv[2] directly.
const channelId = process.argv
  .slice(2)
  .find((arg) => arg !== "--")
  ?.trim();
if (!channelId) {
  console.error("Usage: pnpm run webhook -- <CHANNEL_ID>");
  process.exit(1);
}

const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
if (!botToken) {
  console.error(
    "DISCORD_BOT_TOKEN is not set. Add it to .env (or export it) first — " +
      "see the Bot tab of your app at https://discord.com/developers/applications. " +
      "The bot must also already be in the server with this channel, with " +
      "Manage Webhooks (see `pnpm run invite`).",
  );
  process.exit(1);
}

const response = await fetch(
  `https://discord.com/api/v10/channels/${channelId}/webhooks`,
  {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "OpenMiQ-API Review" }),
  },
);

if (!response.ok) {
  const body = await response.text();
  console.error(`Discord API returned ${response.status}: ${body}`);
  process.exit(1);
}

const webhook = await response.json();
const url =
  webhook.url ??
  `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;

console.log("Application-owned webhook created.");
console.log(`Set this in .env: DISCORD_REVIEW_WEBHOOK_URL=${url}`);
