import { ofetch } from "ofetch";
import type { Env } from "../config/env.ts";

const DISCORD_API_BASE = "https://discord.com/api/v10";

export interface DiscordUser {
  id: string;
  username: string;
  email: string;
}

export function buildAuthorizationUrl(env: Env, state: string): string {
  const url = new URL(`${DISCORD_API_BASE}/oauth2/authorize`);
  url.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
  url.searchParams.set(
    "redirect_uri",
    `${env.APP_BASE_URL}/api/auth/discord/callback`,
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify email");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(
  env: Env,
  code: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: `${env.APP_BASE_URL}/api/auth/discord/callback`,
  });
  const response = await ofetch<{ access_token: string }>(
    `${DISCORD_API_BASE}/oauth2/token`,
    {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );
  return response.access_token;
}

export async function fetchDiscordUser(
  accessToken: string,
): Promise<DiscordUser> {
  const user = await ofetch<{
    id: string;
    username: string;
    email: string | null;
  }>(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!user.email) {
    throw new Error("Discord account has no verified email");
  }
  return { id: user.id, username: user.username, email: user.email };
}
