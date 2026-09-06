// The DB only stores a Discord user's id/username (see packages/db's users table), never their avatar hash, so there's no way to show their actual set avatar here without a bot token making a live API call per row.
// This computes Discord's own *default* avatar instead — deterministic from the id alone, no request needed.
// Good enough for admin-page identification; virtually every account today is migrated to the newer "Pomelo" username system this formula assumes (see Discord's own "Default Avatar" docs).
export function defaultDiscordAvatarUrl(discordId: string): string {
  const index = Number((BigInt(discordId) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
