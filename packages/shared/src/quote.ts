import { z } from "zod";

export const quoteOptionsSchema = z.object({
  color: z.boolean().optional(),
  bold: z.boolean().optional(),
  layout: z.enum(["side", "new"]).optional(),
  hosted: z.boolean().optional(),
});

// ~5.25MB decoded (base64 runs ~4/3 the size of the bytes it encodes) — comfortably past a real profile picture or logo, without letting a JSON body carry an unbounded blob.
const MAX_RAW_IMAGE_BASE64_LENGTH = 7_000_000;
const rawImageSchema = z.base64().max(MAX_RAW_IMAGE_BASE64_LENGTH);

export const quoteRequestSchema = z.object({
  authorName: z.string().min(1).max(128),
  authorAvatarUrl: z.url().optional(),
  // Raw image bytes, base64-encoded, as an alternative to authorAvatarUrl — wins when both are given.
  authorAvatarRaw: rawImageSchema.optional(),
  text: z.string().min(1).max(4000),
  theme: z.string().optional(),
  font: z.string().optional(),
  // Drawn in place of the usual attribution watermark, as text. Defaults to the server's LOGO_PATH image when none of this/watermarkUrl/watermarkRaw are given — pass a string here (including "") to override that default with your own text.
  watermark: z.string().optional(),
  // Same, but an image (a logo, say) instead of text, by URL — wins over `watermark` when both are given.
  watermarkUrl: z.url().optional(),
  // Same idea as authorAvatarRaw, but for the watermark — wins over both `watermark` and `watermarkUrl` when more than one is given.
  watermarkRaw: rawImageSchema.optional(),
  options: quoteOptionsSchema.optional(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
