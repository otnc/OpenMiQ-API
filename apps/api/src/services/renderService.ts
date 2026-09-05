import { MiQ } from "makeitaquote";
import type { QuoteRequest } from "@openmiq/shared";

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

export async function renderQuote(input: QuoteRequest): Promise<Buffer> {
  const miq = new MiQ();
  miq.setText(input.text);
  miq.setUsername(input.authorName);
  if (input.authorAvatarUrl) miq.setAvatar(input.authorAvatarUrl);
  miq.setTheme(buildTheme(input));
  return miq.toBuffer("png");
}

// Matches OpenMiQ's /fakequote: same rendering, but the name is marked as
// fabricated so a generated quote is never mistaken for a real one.
export async function renderFakeQuote(input: QuoteRequest): Promise<Buffer> {
  const miq = new MiQ();
  miq.setText(input.text);
  miq.setDisplayName(`(fake) ${input.authorName}`);
  miq.setUsername(input.authorName);
  if (input.authorAvatarUrl) miq.setAvatar(input.authorAvatarUrl);
  miq.setTheme(buildTheme(input));
  return miq.toBuffer("png");
}
