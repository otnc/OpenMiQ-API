import { ValidationError } from "@makeitaquote/utils/errors";
import { resolveNoteText, stripMfm } from "@makeitaquote/utils/mfm";
import { emptyQuote } from "./quote.ts";
import type { NoteLike, NoteSourceOptions, QuoteData } from "./types.ts";

function isNoteLike(value: unknown): value is NoteLike {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<NoteLike>;
  if (candidate.user === null || typeof candidate.user !== "object") {
    return false;
  }
  return typeof candidate.user.username === "string";
}

/**
 * Derives a quote from a Misskey note.
 *
 * The Misskey counterpart to `fromMessage()`, and shaped by the same rule:
 * quote what a reader saw. That means the display name over the handle, the
 * author's own avatar, and — by default — the note with its MFM scaffolding
 * taken off.
 */
export function fromNote(
  note: unknown,
  options: NoteSourceOptions = {},
): QuoteData {
  if (!isNoteLike(note)) {
    throw new ValidationError(
      "setFromNote expects a note with `user.username`",
      { field: "note" },
    );
  }
  const source = resolveNoteText(note, options.preferCw);
  const text = options.stripMfm === false ? source : stripMfm(source);
  const authorName = note.user.name || note.user.username;
  const authorAvatarUrl = note.user.avatarUrl ?? null;
  return { ...emptyQuote(), text, authorName, authorAvatarUrl };
}
