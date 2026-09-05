import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(64),
  expiresAt: z.iso.datetime().nullable(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(64).optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
