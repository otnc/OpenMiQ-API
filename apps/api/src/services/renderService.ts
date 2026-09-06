import { MiQ } from "makeitaquote";
import type { QuoteRequest } from "@openmiq/shared";
import type { Env } from "../config/env.ts";
import { getLogoWatermark } from "./logoWatermark.ts";

function buildTheme(input: QuoteRequest): Record<string, unknown> {
  const theme: Record<string, unknown> = { extends: "dark" };
  const text: Record<string, unknown> = {};

  if (input.options?.layout) theme.layout = input.options.layout;
  if (input.options?.color !== undefined) {
    theme.avatar = { grayscale: !input.options.color };
  }
  if (input.options?.bold) text.weight = "bold";
  if (input.font) text.font = input.font;
  if (Object.keys(text).length > 0) theme.text = text;
  if (input.theme) theme.background = input.theme;

  return theme;
}

// `watermarkUrl` wins when given (drawn as an image), then the caller's own text `watermark` (even an empty string — an explicit "no watermark").
// Otherwise the LOGO_PATH image, matching OpenMiQ and OpenMiQ-misskey's own convention of drawing the configured logo in place of the usual attribution.
// `undefined` when none of these apply, leaving makeitaquote's own default in place.
function resolveWatermark(
  input: QuoteRequest,
  env: Env,
): string | Buffer | URL | undefined {
  if (input.watermarkUrl) return new URL(input.watermarkUrl);
  if (input.watermark !== undefined) return input.watermark;
  return getLogoWatermark(env);
}

export async function renderQuote(
  input: QuoteRequest,
  env: Env,
): Promise<Buffer> {
  const miq = new MiQ();
  miq.setText(input.text);
  miq.setUsername(input.authorName);
  if (input.authorAvatarUrl) miq.setAvatar(input.authorAvatarUrl);
  miq.setTheme(buildTheme(input));
  const watermark = resolveWatermark(input, env);
  if (watermark !== undefined) miq.setWatermark(watermark);
  return miq.toBuffer("png");
}

// Matches OpenMiQ's /fakequote: same rendering, but the name is marked as
// fabricated so a generated quote is never mistaken for a real one.
export async function renderFakeQuote(
  input: QuoteRequest,
  env: Env,
): Promise<Buffer> {
  const miq = new MiQ();
  miq.setText(input.text);
  miq.setDisplayName(`(fake) ${input.authorName}`);
  miq.setUsername(input.authorName);
  if (input.authorAvatarUrl) miq.setAvatar(input.authorAvatarUrl);
  miq.setTheme(buildTheme(input));
  const watermark = resolveWatermark(input, env);
  if (watermark !== undefined) miq.setWatermark(watermark);
  return miq.toBuffer("png");
}
