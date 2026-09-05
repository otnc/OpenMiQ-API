import { z } from "zod";

export const consentSchema = z.object({
  agree: z.boolean(),
  termsVersion: z.string().min(1),
  privacyVersion: z.string().min(1),
});

export type ConsentInput = z.infer<typeof consentSchema>;
