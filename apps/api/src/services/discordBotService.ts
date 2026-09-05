import { ofetch } from "ofetch";

export interface DiscordBotUser {
  id: string;
  username: string;
  /** A ready-to-use CDN URL — the user's own avatar if set, Discord's default avatar otherwise. */
  avatarUrl: string;
}

interface DiscordApiUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

function defaultAvatarUrl(user: DiscordApiUser): string {
  // Pre-Pomelo accounts (discriminator !== "0") pick from Discord's original
  // 5 default avatars by discriminator; migrated accounts pick from the
  // newer 6 by a shift of their snowflake — see Discord's own docs on
  // "Default Avatar" for both formulas.
  const index =
    user.discriminator === "0"
      ? Number((BigInt(user.id) >> 22n) % 6n)
      : Number(user.discriminator) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

/**
 * Fetches an arbitrary Discord user's public profile by id, using the bot
 * token — unlike the OAuth2 flow elsewhere in this app, this doesn't
 * require that user to have logged in themselves.
 */
export async function fetchDiscordUserById(
  botToken: string,
  userId: string,
): Promise<DiscordBotUser> {
  const user = await ofetch<DiscordApiUser>(
    `https://discord.com/api/v10/users/${userId}`,
    { headers: { Authorization: `Bot ${botToken}` } },
  );
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : defaultAvatarUrl(user);
  return { id: user.id, username: user.username, avatarUrl };
}
