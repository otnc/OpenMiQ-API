#!/usr/bin/env node
// Prints the bot invite link needed to set up DISCORD_REVIEW_WEBHOOK_URL
// (README.md "Discord setup" step 5) — the bot must join the server with
// your review channel, granted Manage Webhooks, before `pnpm run webhook`
// can create an application-owned webhook there.

const MANAGE_WEBHOOKS = 1n << 29n; // 536870912

const clientId = process.env.DISCORD_CLIENT_ID?.trim();
if (!clientId) {
  console.error(
    "DISCORD_CLIENT_ID is not set. Add it to .env (or export it) first — " +
      "see the OAuth2 tab of your app at https://discord.com/developers/applications.",
  );
  process.exit(1);
}

const url = new URL("https://discord.com/oauth2/authorize");
url.searchParams.set("client_id", clientId);
url.searchParams.set("scope", "bot");
url.searchParams.set("permissions", MANAGE_WEBHOOKS.toString());

console.log(url.toString());
