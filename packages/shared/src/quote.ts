import { z } from "zod";

export const quoteOptionsSchema = z.object({
  color: z.boolean().optional(),
  bold: z.boolean().optional(),
  layout: z.enum(["side", "new"]).optional(),
  hosted: z.boolean().optional(),
});

export const quoteRequestSchema = z.object({
  authorName: z.string().min(1).max(128),
  // A raw image can't go here directly — POST /api/uploads it first (multipart/form-data) and use the URL it returns, same as any other authorAvatarUrl.
  authorAvatarUrl: z.url().optional(),
  text: z.string().min(1).max(4000),
  theme: z.string().optional(),
  font: z.string().optional(),
  // Drawn in place of the usual attribution watermark, as text. Defaults to the server's LOGO_PATH image when neither this nor watermarkUrl are given — pass a string here (including "") to override that default with your own text.
  watermark: z.string().optional(),
  // Same, but an image (a logo, say) instead of text — wins over `watermark` when both are given. Also uploaded via POST /api/uploads first, same as authorAvatarUrl.
  watermarkUrl: z.url().optional(),
  options: quoteOptionsSchema.optional(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
