import { Hono, type Context } from "hono";
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

export function createQuoteApp(env: Env) {
  const app = new Hono();
  const db = getDb(env);
  const imageStore = createImageStore(env);

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
