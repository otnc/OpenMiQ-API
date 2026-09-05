export { stripDiscordMarkdown } from "@makeitaquote/utils/discord";
export { MiQError, ValidationError } from "@makeitaquote/utils/errors";
export { stripMarkdown } from "@makeitaquote/utils/markdown";
export { resolveNoteText, stripMfm } from "@makeitaquote/utils/mfm";
export { stripTwitterText } from "@makeitaquote/utils/twitter";

export { OpenMiQ } from "./client.ts";
export {
  DEFAULT_BASE_URL,
  FAKEQUOTE_PATH,
  QUOTE_PATH,
  USAGE_PATH,
} from "./endpoints.ts";
export { OpenMiQApiError, type OpenMiQApiErrorOptions } from "./errors.ts";
export { fromNote } from "./note.ts";
export { fromMessage } from "./source.ts";
export { fromTweet } from "./tweet.ts";
export {
  type FxTwitterStatusLike,
  fromFxTwitterStatus,
  fromTwitterApiV2Tweet,
  type TweetV2Like,
  type UserV2Like,
} from "./tweetAdapters.ts";
export type {
  AvatarSource,
  MentionOptions,
  MessageLike,
  MessageSourceOptions,
  NoteLike,
  NoteSourceOptions,
  OpenMiQOptions,
  QuoteData,
  QuoteInput,
  TweetLike,
  TweetSourceOptions,
  UsageResult,
} from "./types.ts";
