/** The OpenMiQ-API only accepts an avatar URL, not image data — unlike some sibling packages' APIs. */
export type AvatarSource = string | URL;

/** The normalized quote, after validation. */
export interface QuoteData {
  text: string;
  authorName: string;
  authorAvatarUrl: string | null;
  theme: string | null;
  font: string | null;
  color: boolean | null;
  bold: boolean | null;
  layout: "side" | "new" | null;
  /** When true, targets `/api/fakequote` instead of `/api/quote`. */
  fake: boolean;
}

/** A partial quote, as accepted by `setFromObject()`. */
export interface QuoteInput {
  text?: string;
  authorName?: string;
  authorAvatarUrl?: AvatarSource | null;
  theme?: string | null;
  font?: string | null;
  color?: boolean | null;
  bold?: boolean | null;
  layout?: "side" | "new" | null;
  fake?: boolean;
}

export interface OpenMiQOptions {
  /** An API key issued from your OpenMiQ-API instance's Web Console. */
  apiKey: string;
  /**
   * The base URL of the OpenMiQ-API instance to talk to, e.g.
   * `"https://miq.example.com"` or `"http://localhost:9413"` for a local
   * instance. Required — OpenMiQ-API is meant to be self-hosted, so this
   * package has no single default host to fall back to.
   */
  baseUrl: string;
  /** Request timeout in ms, default 15000. */
  timeout?: number;
  /** Retry attempts for transient failures, default 2. */
  retry?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** The current rate-limit window for the API key in use (`GET /api/usage`). */
export interface UsageResult {
  limit: number;
  remaining: number;
  resetAt: string;
  requestCount: number;
  lastUsedAt: string | null;
}

/**
 * The shape of a Discord message that `setFromMessage()` understands.
 *
 * Structural on purpose: discord.js v13, v14 and discord.js-selfbot-v13 all
 * satisfy it, so this package needs no dependency on any of them.
 */
export interface MessageLike {
  content: string;
  author: {
    username: string;
    globalName?: string | null;
    global_name?: string | null;
    discriminator?: string | null;
    displayAvatarURL?(options?: unknown): string;
  };
  member?: {
    displayName?: string;
    nickname?: string | null;
    displayAvatarURL?(options?: unknown): string;
  } | null;
  /**
   * discord.js's per-message mention Collections. Optional, and each
   * Collection independently so — a `Message` always has all four in
   * practice, but nothing here requires it.
   */
  mentions?: {
    members?: {
      get(
        id: string,
      ): { displayName?: string; nickname?: string | null } | undefined;
    } | null;
    users?: {
      get(id: string): { username?: string } | undefined;
    };
    channels?: {
      get(id: string): { id?: string; name?: string | null } | undefined;
    };
    roles?: {
      get(id: string): { name?: string } | undefined;
    };
  };
}

/** How `<t:…>` timestamps are rendered when mentions are resolved. */
export interface MentionOptions {
  /** BCP 47 tag, e.g. `'ja-JP'`. Default `'en-GB'`. */
  locale?: string;
  /** IANA zone, e.g. `'Asia/Tokyo'`. Default `'UTC'`. */
  timeZone?: string;
  /** What `<t:…:R>` counts from. Defaults to now; mostly a test seam. */
  now?: Date;
}

/**
 * Which version of a Discord user's avatar and name to quote.
 *
 * Both default to the server's, since that is what a reader of that server
 * actually saw. Whichever you pick, the other is the fallback.
 */
export interface MessageSourceOptions {
  /** `'guild'` (default) prefers a per-server avatar; `'global'` the account's. */
  avatar?: "guild" | "global";
  /** `'nickname'` (default) prefers a per-server nickname; `'global'` the account's. */
  name?: "nickname" | "global";
  /** Runs `message.content` through `stripDiscordMarkdown()` before quoting it. Default false. */
  stripDiscordMarkdown?: boolean;
  /**
   * Expands Discord's raw tokens into the text a reader saw: user, role and
   * channel mentions, slash commands, `<t:…>` timestamps and guild
   * navigation tabs. Default true. Pass an object to control timestamp
   * rendering.
   */
  resolveMentions?: boolean | MentionOptions;
}

/**
 * The shape of a Misskey note that `setFromNote()` understands.
 *
 * Structural, like `MessageLike`: this is what the API actually returns for
 * a note, so a response passed straight through fits without adaptation.
 */
export interface NoteLike {
  text?: string | null;
  /** Content warning. Only read when `preferCw` is true. */
  cw?: string | null;
  user: {
    username: string;
    name?: string | null;
    host?: string | null;
    avatarUrl?: string | null;
  };
}

export interface NoteSourceOptions {
  /** Runs the note through `stripMfm()` before quoting it. Default **true**. */
  stripMfm?: boolean;
  /** Quote the content warning instead of the text it hides. Default false. */
  preferCw?: boolean;
}

/**
 * The shape of a tweet/post that `setFromTweet()` understands.
 *
 * Structural, like `MessageLike`. `fromTwitterApiV2Tweet()` and
 * `fromFxTwitterStatus()` adapt a real API response into this shape.
 */
export interface TweetLike {
  text: string;
  author: {
    /** Handle, without the leading `@`. */
    username: string;
    /** Display name. Falls back to the handle when absent. */
    name?: string | null;
    avatarUrl?: string | null;
  };
}

export interface TweetSourceOptions {
  /** Normalizes "Twitter bold/italic" Unicode styling back to plain ASCII. Default false. */
  stripTwitterText?: boolean;
}
