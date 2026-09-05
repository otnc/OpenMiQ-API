import { z } from "zod";

export const applicationMessageSchema = z.string().min(20).max(500);

export const applicationSchema = z.object({
  message: applicationMessageSchema,
  fingerprint: z.string().min(1),
  agreedTermsVersion: z.string().min(1),
  agreedPrivacyVersion: z.string().min(1),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
