import { Hono } from "hono";
import type { Env } from "../config/env.ts";
import { termsContent, privacyContent, type Locale } from "../legal/content.ts";

function resolveLocale(query: string | undefined): Locale {
  return query === "ja" ? "ja" : "en";
}

export function createLegalApp(env: Env) {
  const app = new Hono();

  app.get("/api/legal/terms", (c) => {
    const lang = resolveLocale(c.req.query("lang"));
    return c.json({
      version: env.TERMS_VERSION,
      lang,
      content: termsContent[lang],
    });
  });

  app.get("/api/legal/privacy", (c) => {
    const lang = resolveLocale(c.req.query("lang"));
    return c.json({
      version: env.PRIVACY_VERSION,
      lang,
      content: privacyContent[lang],
    });
  });

  return app;
}
