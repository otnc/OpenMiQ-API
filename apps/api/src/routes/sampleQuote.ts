import { Hono } from "hono";
import { getSampleQuote } from "../services/sampleQuoteService.ts";

export function createSampleQuoteApp() {
  const app = new Hono();

  app.get("/api/sample-quote", (c) => {
    const buffer = getSampleQuote();
    if (!buffer) return c.body(null, 404);
    return c.body(new Uint8Array(buffer), 200, {
      "Content-Type": "image/png",
    });
  });

  return app;
}
