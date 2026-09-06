import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { hostedImages } from "@openmiq/db";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { apiKeyAuthMiddleware } from "../middleware/apiKeyAuth.ts";
import { createImageStore } from "../services/imageStore/index.ts";
import { newSecretToken } from "../lib/ids.ts";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const uploadResultSchema = z.object({ url: z.url() });
const invalidRequestSchema = z.object({
  error: z.literal("invalid_request"),
  issues: z.array(z.any()),
});
const authErrorSchema = z.object({ error: z.string() });

// A place to put an avatar/watermark image before referencing it in POST /api/quote's own authorAvatarUrl/watermarkUrl — the earlier design tried embedding raw bytes straight into that JSON body (as base64), which risked tripping reverse-proxy body-size limits (nginx defaults to 1MB) for something that isn't the quote request itself.
// Uploading first and passing a URL keeps that request small no matter the image size, and reuses the exact same storage/serving path (imageStore, hosted_images, GET /api/images/:id) that `hosted: true` quote output already goes through — this is genuinely the same "stage a file, get a URL back" mechanism, just fed by an upload instead of a render.
export function createUploadsApp(env: Env) {
  const app = new OpenAPIHono();
  const db = getDb(env);
  const imageStore = createImageStore(env);

  app.openAPIRegistry.registerPath(
    createRoute({
      method: "post",
      path: "/api/uploads",
      summary:
        "Upload an image to reference by URL elsewhere (e.g. authorAvatarUrl/watermarkUrl)",
      security: [{ ApiKeyAuth: [] }],
      request: {
        body: {
          content: {
            "multipart/form-data": {
              schema: z.object({
                file: z.string().openapi({
                  type: "string",
                  format: "binary",
                  description: `An image file — ${[...ALLOWED_CONTENT_TYPES].join(", ")}, up to ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`,
                }),
              }),
            },
          },
        },
      },
      responses: {
        201: {
          description: "The uploaded image's URL",
          content: { "application/json": { schema: uploadResultSchema } },
        },
        400: {
          description: "Missing file, unsupported type, or too large",
          content: { "application/json": { schema: invalidRequestSchema } },
        },
        401: {
          description: "Missing, invalid, revoked or expired API key",
          content: { "application/json": { schema: authErrorSchema } },
        },
        403: {
          description: "Account not approved, or reconsent required",
          content: { "application/json": { schema: authErrorSchema } },
        },
        429: {
          description: "Rate limit exceeded for this API key",
          content: { "application/json": { schema: authErrorSchema } },
        },
      },
    }),
  );

  app.post("/api/uploads", apiKeyAuthMiddleware(env, db), async (c) => {
    const body = await c.req.parseBody().catch(() => null);
    const file = body?.file;
    if (!(file instanceof File)) {
      return c.json(
        {
          error: "invalid_request",
          issues: [{ message: "file is required (multipart/form-data)" }],
        },
        400,
      );
    }
    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return c.json(
        {
          error: "invalid_request",
          issues: [{ message: `unsupported content type: ${file.type}` }],
        },
        400,
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return c.json(
        {
          error: "invalid_request",
          issues: [{ message: `file exceeds ${MAX_UPLOAD_BYTES} bytes` }],
        },
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = newSecretToken();
    await imageStore.put(id, buffer);
    const expiresAt = env.HOSTED_IMAGE_TTL_HOURS
      ? new Date(Date.now() + env.HOSTED_IMAGE_TTL_HOURS * 60 * 60 * 1000)
      : null;
    await db.insert(hostedImages).values({
      id,
      contentType: file.type,
      expiresAt,
    });
    return c.json({ url: `${env.APP_BASE_URL}/api/images/${id}` }, 201);
  });

  return app;
}
