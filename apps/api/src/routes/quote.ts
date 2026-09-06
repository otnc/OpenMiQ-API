import type { Context } from "hono";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { quoteRequestSchema, type QuoteRequest } from "@openmiq/shared";
import { hostedImages } from "@openmiq/db";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { apiKeyAuthMiddleware } from "../middleware/apiKeyAuth.ts";
import { renderQuote, renderFakeQuote } from "../services/renderService.ts";
import { createImageStore } from "../services/imageStore/index.ts";
import { newSecretToken } from "../lib/ids.ts";

type RenderFn = (input: QuoteRequest, env: Env) => Promise<Buffer>;

// Documentation only — the actual request/response handling below is unchanged, hand-rolled Hono.
// `registerPath()` just adds these to the generated OpenAPI document (GET /api/docs); it does not run any of zod-openapi's own request validation.
// So the exact error shapes below (e.g. `{ error: "invalid_request", issues }`) stay exactly what they were.
const authErrorSchema = z.object({ error: z.string() }).openapi({
  description:
    "Authentication/authorization failure — see AUTH_ERROR_STATUS in apiKeyAuth.ts for the possible `error` values.",
});
const invalidRequestSchema = z.object({
  error: z.literal("invalid_request"),
  issues: z.array(z.any()),
});
const hostedResultSchema = z.object({ url: z.url() });
const pngSchema = z.string().openapi({
  format: "binary",
  description: "PNG image bytes",
});

function renderRoute(path: "/api/quote" | "/api/fakequote", summary: string) {
  return createRoute({
    method: "post",
    path,
    summary,
    security: [{ ApiKeyAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: quoteRequestSchema } },
      },
    },
    responses: {
      200: {
        description: "The rendered quote image (one round trip)",
        content: { "image/png": { schema: pngSchema } },
      },
      201: {
        description: "The uploaded image's URL (`options.hosted: true`)",
        content: { "application/json": { schema: hostedResultSchema } },
      },
      400: {
        description: "The request body failed validation",
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
  });
}

export function createQuoteApp(env: Env) {
  const app = new OpenAPIHono();
  const db = getDb(env);
  const imageStore = createImageStore(env);

  app.openAPIRegistry.registerPath(
    renderRoute("/api/quote", "Render a quote image"),
  );
  app.openAPIRegistry.registerPath(
    renderRoute("/api/fakequote", "Render a quote image marked as fabricated"),
  );
  app.openAPIRegistry.registerPath(
    createRoute({
      method: "get",
      path: "/api/images/{id}",
      summary: "Fetch a hosted quote image",
      request: { params: z.object({ id: z.string() }) },
      responses: {
        200: {
          description: "The hosted image",
          content: { "image/png": { schema: pngSchema } },
        },
        404: { description: "Not found, or its TTL has expired" },
      },
    }),
  );

  async function handleRender(c: Context, render: RenderFn) {
    const body = await c.req.json().catch(() => null);
    const parsed = quoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "invalid_request", issues: parsed.error.issues },
        400,
      );
    }

    const png = await render(parsed.data, env);

    if (parsed.data.options?.hosted) {
      const id = newSecretToken();
      await imageStore.put(id, png);
      const expiresAt = env.HOSTED_IMAGE_TTL_HOURS
        ? new Date(Date.now() + env.HOSTED_IMAGE_TTL_HOURS * 60 * 60 * 1000)
        : null;
      await db.insert(hostedImages).values({ id, expiresAt });
      return c.json({ url: `${env.APP_BASE_URL}/api/images/${id}` }, 201);
    }

    // c.body(), not `new Response(...)` — a fresh Response would discard
    // the RateLimit-* headers apiKeyAuthMiddleware already set on `c`.
    return c.body(new Uint8Array(png), 200, { "Content-Type": "image/png" });
  }

  app.post("/api/quote", apiKeyAuthMiddleware(env, db), (c) =>
    handleRender(c, renderQuote),
  );
  app.post("/api/fakequote", apiKeyAuthMiddleware(env, db), (c) =>
    handleRender(c, renderFakeQuote),
  );

  app.get("/api/images/:id", async (c) => {
    const id = c.req.param("id");
    const rows = await db
      .select()
      .from(hostedImages)
      .where(eq(hostedImages.id, id))
      .limit(1);
    const record = rows[0];
    if (!record) return c.text("Not found", 404);
    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      return c.text("Not found", 404);
    }

    const buffer = await imageStore.get(id);
    if (!buffer) return c.text("Not found", 404);
    return c.body(new Uint8Array(buffer), 200, { "Content-Type": "image/png" });
  });

  return app;
}
