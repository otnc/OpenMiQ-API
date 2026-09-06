import { ValidationError } from "@makeitaquote/utils/errors";
import { stripTwitterText } from "@makeitaquote/utils/twitter";
import { emptyQuote } from "./quote.ts";
import type { QuoteData, TweetLike, TweetSourceOptions } from "./types.ts";

function isTweetLike(value: unknown): value is TweetLike {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<TweetLike>;
  if (typeof candidate.text !== "string") return false;
  if (candidate.author === null || typeof candidate.author !== "object") {
    return false;
  }
  return typeof candidate.author.username === "string";
}

/**
 * Derives a quote from a tweet/post.
 *
 * The X/Twitter counterpart to `fromMessage()`/`fromNote()`: quote what a
 * reader saw, which is the text exactly as written by default — X does not
 * expand a tweet's `t.co` links or `@handle` mentions into anything else in
 * its own timeline either, so there is nothing here to resolve.
 */
export function fromTweet(
  tweet: unknown,
  options: TweetSourceOptions = {},
): QuoteData {
  if (!isTweetLike(tweet)) {
    throw new ValidationError(
      "setFromTweet expects a tweet with `text` and `author.username`",
      { field: "tweet" },
    );
  }
  const text = options.stripTwitterText
    ? stripTwitterText(tweet.text)
    : tweet.text;
  const authorName = tweet.author.name || tweet.author.username;
  const authorAvatarUrl = tweet.author.avatarUrl ?? null;
  return {
    ...emptyQuote(),
    text,
    authorName,
    authorUsername: tweet.author.username,
    authorAvatarUrl,
  };
}
