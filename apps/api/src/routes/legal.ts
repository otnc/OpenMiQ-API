import { Hono } from "hono";
import type { Env } from "../config/env.ts";
import {
  termsVersions,
  privacyVersions,
  type Locale,
} from "../legal/content.ts";
import { diffVersions } from "../legal/diff.ts";

function resolveLocale(query: string | undefined): Locale {
  return query === "ja" ? "ja" : "en";
}

export function createLegalApp(env: Env) {
  const app = new Hono();

  app.get("/api/legal/terms", (c) => {
    const lang = resolveLocale(c.req.query("lang"));
    const content = termsVersions[env.TERMS_VERSION]?.[lang];
    if (!content) return c.json({ error: "version_not_found" }, 404);
    return c.json({ version: env.TERMS_VERSION, lang, content });
  });

  app.get("/api/legal/privacy", (c) => {
    const lang = resolveLocale(c.req.query("lang"));
    const content = privacyVersions[env.PRIVACY_VERSION]?.[lang];
    if (!content) return c.json({ error: "version_not_found" }, 404);
    return c.json({ version: env.PRIVACY_VERSION, lang, content });
  });

  // Diffs the version a user last agreed to against the current one, so
  // the reconsent screen can show what actually changed instead of the
  // full text again (DESIGN.md §16.4).
  app.get("/api/legal/terms/diff", (c) => {
    const lang = resolveLocale(c.req.query("lang"));
    const from = c.req.query("from");
    if (!from) return c.json({ error: "from_required" }, 400);
    return c.json(diffVersions(termsVersions, from, env.TERMS_VERSION, lang));
  });

  app.get("/api/legal/privacy/diff", (c) => {
    const lang = resolveLocale(c.req.query("lang"));
    const from = c.req.query("from");
    if (!from) return c.json({ error: "from_required" }, 400);
    return c.json(
      diffVersions(privacyVersions, from, env.PRIVACY_VERSION, lang),
    );
  });

  return app;
}
