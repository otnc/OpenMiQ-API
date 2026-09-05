import { z } from "zod";

export const quoteOptionsSchema = z.object({
  color: z.boolean().optional(),
  bold: z.boolean().optional(),
  layout: z.enum(["side", "new"]).optional(),
  hosted: z.boolean().optional(),
});

export const quoteRequestSchema = z.object({
  authorName: z.string().min(1).max(128),
  authorAvatarUrl: z.url().optional(),
  text: z.string().min(1).max(4000),
  theme: z.string().optional(),
  font: z.string().optional(),
  options: quoteOptionsSchema.optional(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
