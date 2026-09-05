import { z } from "zod";

// Backticks and backslashes are rejected outright, not just escaped:
// applicationService.ts posts this message into a Discord embed field
// wrapped in a ``` code block (discordWebhookService.ts's reviewEmbed()) —
// a backtick in the message could close that fence early and inject
// arbitrary Markdown/mentions into the review embed.
export const applicationMessageSchema = z
  .string()
  .min(20)
  .max(500)
  .regex(/^[^`\\]*$/, "message must not contain backticks or backslashes");

export const applicationSchema = z.object({
  message: applicationMessageSchema,
  fingerprint: z.string().min(1),
  agreedTermsVersion: z.string().min(1),
  agreedPrivacyVersion: z.string().min(1),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
