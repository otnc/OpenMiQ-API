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
    theme: null,
    font: null,
    color: null,
    bold: null,
    layout: null,
    watermark: null,
    fake: false,
  };
}

export function normalizeText(text: unknown): string {
  return normalizeString(text, "text", MAX_TEXT_LENGTH);
}

export function normalizeAuthorName(name: unknown): string {
  return normalizeString(name, "authorName", MAX_AUTHOR_NAME_LENGTH);
}

/** The API only takes a URL, so raw image bytes are rejected here. */
export function normalizeAuthorAvatarUrl(avatar: unknown): string | null {
  if (avatar === null || avatar === undefined) return null;
  const normalized = normalizeAvatarSource(avatar, "authorAvatarUrl");
  if (typeof normalized !== "string" && !(normalized instanceof URL)) {
    throw new ValidationError(
      "The OpenMiQ-API only accepts an avatar URL, not image data",
      { field: "authorAvatarUrl" },
    );
  }
  return String(normalized);
}

export function normalizeTheme(theme: unknown): string | null {
  if (theme === null || theme === undefined) return null;
  return normalizeString(theme, "theme", MAX_THEME_LENGTH);
}

export function normalizeFont(font: unknown): string | null {
  if (font === null || font === undefined) return null;
  return normalizeString(font, "font", MAX_FONT_LENGTH);
}

/**
 * `null` (the default) leaves the server's own default watermark in place —
 * its LOGO_PATH image, if the instance has one configured. An empty string
 * is a valid override: it asks for no watermark at all.
 */
export function normalizeWatermark(watermark: unknown): string | null {
  if (watermark === null || watermark === undefined) return null;
  return normalizeString(watermark, "watermark", MAX_WATERMARK_LENGTH);
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
    next.authorAvatarUrl = normalizeAuthorAvatarUrl(input.authorAvatarUrl);
  }
  if (input.theme !== undefined) next.theme = normalizeTheme(input.theme);
  if (input.font !== undefined) next.font = normalizeFont(input.font);
  if (input.color !== undefined) {
    next.color = normalizeFlag(input.color, "color");
  }
  if (input.bold !== undefined) next.bold = normalizeFlag(input.bold, "bold");
  if (input.layout !== undefined) next.layout = normalizeLayout(input.layout);
  if (input.watermark !== undefined) {
    next.watermark = normalizeWatermark(input.watermark);
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
