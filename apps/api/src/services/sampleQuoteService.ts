import type { QuoteRequest } from "@openmiq/shared";
import type { Env } from "../config/env.ts";
import { fetchDiscordUserById } from "./discordBotService.ts";
import { renderQuote } from "./renderService.ts";

const SAMPLE_TEXT =
  "This is a sample quote, generated automatically for this page.";

// Generated once at startup (not per-request, not on a timer) from the
// first ADMIN_DISCORD_IDS entry's own Discord avatar, then served as-is on
// the homepage. Module-level like getDb()'s singleton, so it's shared
// across every createApp() call in this process; index.ts is the only
// caller that actually triggers generation, so tests (which call
// createApp() directly, never index.ts) never make the real network
// request this needs.
let cached: Buffer | null = null;

export function getSampleQuote(): Buffer | null {
  return cached;
}

export async function generateSampleQuote(env: Env): Promise<void> {
  const adminId = env.ADMIN_DISCORD_IDS[0];
  if (!env.DISCORD_BOT_TOKEN || !adminId) return;
  try {
    const admin = await fetchDiscordUserById(env.DISCORD_BOT_TOKEN, adminId);
    const input: QuoteRequest = {
      authorName: admin.username,
      authorAvatarUrl: admin.avatarUrl,
      text: SAMPLE_TEXT,
    };
    cached = await renderQuote(input);
  } catch (error) {
    console.error("Failed to generate the homepage sample quote", error);
  }
}
