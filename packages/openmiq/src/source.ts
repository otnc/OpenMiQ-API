import {
  avatarURL,
  globalName,
  guildName,
  resolveMentions,
  stripDiscordMarkdown,
} from "@makeitaquote/utils/discord";
import { ValidationError } from "@makeitaquote/utils/errors";
import { emptyQuote } from "./quote.ts";
import type { MessageLike, MessageSourceOptions, QuoteData } from "./types.ts";

function isMessageLike(value: unknown): value is MessageLike {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<MessageLike>;
  if (typeof candidate.content !== "string") return false;
  if (candidate.author === null || typeof candidate.author !== "object") {
    return false;
  }
  return typeof candidate.author.username === "string";
}

/**
 * Derives a quote from anything shaped like a Discord message.
 *
 * By default the server's view wins for both the avatar and the name — a
 * per-server avatar and nickname are what someone reading that server saw,
 * so they are what a quote from it should show. Both can be switched to the
 * account-wide version; whichever is chosen, the other is still the
 * fallback.
 */
export function fromMessage(
  message: unknown,
  options: MessageSourceOptions = {},
): QuoteData {
  if (!isMessageLike(message)) {
    throw new ValidationError(
      "setFromMessage expects a message with `content` and `author.username`",
      { field: "message" },
    );
  }
  const preferGlobalAvatar = options.avatar === "global";
  const preferGlobalName = options.name === "global";
  const guildAvatar = message.member ? avatarURL(message.member) : null;
  const userAvatar = avatarURL(message.author);

  const withMentions =
    options.resolveMentions === false
      ? message.content
      : resolveMentions(
          message.content,
          message,
          typeof options.resolveMentions === "object"
            ? options.resolveMentions
            : {},
        );
  const text = options.stripDiscordMarkdown
    ? stripDiscordMarkdown(withMentions)
    : withMentions;

  const authorName = preferGlobalName
    ? (globalName(message) ?? guildName(message) ?? message.author.username)
    : (guildName(message) ?? globalName(message) ?? message.author.username);
  const authorAvatarUrl = preferGlobalAvatar
    ? (userAvatar ?? guildAvatar)
    : (guildAvatar ?? userAvatar);

  return { ...emptyQuote(), text, authorName, authorAvatarUrl };
}
