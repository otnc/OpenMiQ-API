import { ValidationError } from "@makeitaquote/utils/errors";
import {
  assertBoolean,
  normalizeAvatarSource,
  normalizeString,
} from "@makeitaquote/utils/validation";
import type { QuoteData, QuoteInput } from "./types.ts";

// Matches the server's own quoteRequestSchema (packages/shared/src/quote.ts
// in the OpenMiQ-API repo) — text/authorName limits, theme/font as opaque
// strings, layout as the two literals the renderer accepts.
const MAX_TEXT_LENGTH = 4000;
const MAX_AUTHOR_NAME_LENGTH = 128;
const MAX_THEME_LENGTH = 256;
const MAX_FONT_LENGTH = 64;
const MAX_WATERMARK_LENGTH = 256;

export function emptyQuote(): QuoteData {
  return {
    text: "",
    authorName: "",
    authorAvatarUrl: null,
    authorAvatarRaw: null,
    theme: null,
    font: null,
    color: null,
    bold: null,
    layout: null,
    watermark: null,
    watermarkUrl: null,
    watermarkRaw: null,
    fake: false,
  };
}

export function normalizeText(text: unknown): string {
  return normalizeString(text, "text", MAX_TEXT_LENGTH);
}

export function normalizeAuthorName(name: unknown): string {
  return normalizeString(name, "authorName", MAX_AUTHOR_NAME_LENGTH);
}

export interface NormalizedAvatar {
  url: string | null;
  /** Base64-encoded, ready for the wire as authorAvatarRaw. */
  raw: string | null;
}

/** A URL/string sets `url`; raw bytes (Uint8Array/Buffer) set `raw` instead — always exactly one of the two, or neither for `null`/`undefined`. */
export function normalizeAuthorAvatar(avatar: unknown): NormalizedAvatar {
  if (avatar === null || avatar === undefined) return { url: null, raw: null };
  const normalized = normalizeAvatarSource(avatar, "authorAvatarUrl");
  if (typeof normalized === "string" || normalized instanceof URL) {
    return { url: String(normalized), raw: null };
  }
  if (normalized instanceof Uint8Array) {
    return { url: null, raw: Buffer.from(normalized).toString("base64") };
  }
  throw new ValidationError(
    "authorAvatarUrl must be a string, URL, or raw image bytes",
    { field: "authorAvatarUrl" },
  );
}

export function normalizeTheme(theme: unknown): string | null {
  if (theme === null || theme === undefined) return null;
  return normalizeString(theme, "theme", MAX_THEME_LENGTH);
}

export function normalizeFont(font: unknown): string | null {
  if (font === null || font === undefined) return null;
  return normalizeString(font, "font", MAX_FONT_LENGTH);
}

export interface NormalizedWatermark {
  text: string | null;
  url: string | null;
  /** Base64-encoded, ready for the wire as watermarkRaw. */
  raw: string | null;
}

/**
 * `null`/`undefined` (the default) leaves the server's own default watermark
 * in place — its LOGO_PATH image, if the instance has one configured. A
 * plain string is drawn as text (`""` is a valid override: it asks for no
 * watermark at all); a URL or raw bytes (Uint8Array/Buffer) are drawn as an
 * image instead, the same rule makeitaquote's own `setWatermark()` follows.
 */
export function normalizeWatermarkValue(
  watermark: unknown,
): NormalizedWatermark {
  if (watermark === null || watermark === undefined) {
    return { text: null, url: null, raw: null };
  }
  if (typeof watermark === "string") {
    return {
      text: normalizeString(watermark, "watermark", MAX_WATERMARK_LENGTH),
      url: null,
      raw: null,
    };
  }
  const normalized = normalizeAvatarSource(watermark, "watermark");
  if (normalized instanceof URL) {
    return { text: null, url: String(normalized), raw: null };
  }
  if (normalized instanceof Uint8Array) {
    return {
      text: null,
      url: null,
      raw: Buffer.from(normalized).toString("base64"),
    };
  }
  throw new ValidationError(
    "watermark must be a string, URL, or raw image bytes",
    { field: "watermark" },
  );
}

export function normalizeLayout(layout: unknown): "side" | "new" | null {
  if (layout === null || layout === undefined) return null;
  if (layout !== "side" && layout !== "new") {
    throw new ValidationError('layout must be "side" or "new"', {
      field: "layout",
    });
  }
  return layout;
}

export function normalizeFlag(value: unknown, field: string): boolean | null {
  if (value === null || value === undefined) return null;
  assertBoolean(value, field);
  return value;
}

/**
 * Applies a partial input onto a quote, validating each provided field.
 *
 * Absent keys are left untouched; `undefined` is treated as absent so that
 * spreading a partially-filled object behaves the way it reads.
 */
export function applyInput(target: QuoteData, input: QuoteInput): QuoteData {
  if (input === null || typeof input !== "object") {
    throw new ValidationError("setFromObject expects an object", {
      field: "input",
    });
  }
  const next = { ...target };
  if (input.text !== undefined) next.text = normalizeText(input.text);
  if (input.authorName !== undefined) {
    next.authorName = normalizeAuthorName(input.authorName);
  }
  if (input.authorAvatarUrl !== undefined) {
    const avatar = normalizeAuthorAvatar(input.authorAvatarUrl);
    next.authorAvatarUrl = avatar.url;
    next.authorAvatarRaw = avatar.raw;
  }
  if (input.theme !== undefined) next.theme = normalizeTheme(input.theme);
  if (input.font !== undefined) next.font = normalizeFont(input.font);
  if (input.color !== undefined) {
    next.color = normalizeFlag(input.color, "color");
  }
  if (input.bold !== undefined) next.bold = normalizeFlag(input.bold, "bold");
  if (input.layout !== undefined) next.layout = normalizeLayout(input.layout);
  if (input.watermark !== undefined) {
    const watermark = normalizeWatermarkValue(input.watermark);
    next.watermark = watermark.text;
    next.watermarkUrl = watermark.url;
    next.watermarkRaw = watermark.raw;
  }
  if (input.fake !== undefined) {
    assertBoolean(input.fake, "fake");
    next.fake = input.fake;
  }
  return next;
}

/**
 * Final check before sending.
 *
 * `text` and `authorName` are both required by the API — anything missing
 * would fail server-side anyway, so it's rejected before the request goes
 * out.
 */
export function assertRenderable(data: QuoteData): void {
  if (data.text.trim().length === 0) {
    throw new ValidationError("text is required", { field: "text" });
  }
  if (data.authorName.trim().length === 0) {
    throw new ValidationError("authorName is required", {
      field: "authorName",
    });
  }
}
