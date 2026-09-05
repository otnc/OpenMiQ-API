import { ofetch } from "ofetch";
import { OAuth2Client } from "@badgateway/oauth2-client";
import type { Env } from "../config/env.ts";

export interface DiscordUser {
  id: string;
  username: string;
  email: string;
}

export function createDiscordOAuthClient(env: Env): OAuth2Client {
  return new OAuth2Client({
    server: "https://discord.com",
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    // Discord's authorize endpoint has no /api prefix, but the token
    // endpoint does — these are Discord's documented OAuth2 URLs, not
    // interchangeable with its versioned /api/v10 REST endpoints.
    authorizationEndpoint: "/oauth2/authorize",
    tokenEndpoint: "/api/oauth2/token",
  });
}

export function redirectUriFor(env: Env): string {
  return `${env.APP_BASE_URL}/api/auth/discord/callback`;
}

export async function fetchDiscordUser(
  accessToken: string,
): Promise<DiscordUser> {
  const user = await ofetch<{
    id: string;
    username: string;
    email: string | null;
  }>("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!user.email) {
    throw new Error("Discord account has no verified email");
  }
  return { id: user.id, username: user.username, email: user.email };
}
