import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { Hono } from "hono";
import type { Env } from "../config/env.ts";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function serveAsset(configuredPath: string | undefined, fallback: string) {
  const path = configuredPath ?? join(process.cwd(), fallback);
  const mimeType =
    MIME_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
  const buffer = readFileSync(path);
  return { buffer, mimeType };
}

export function createBrandingApp(env: Env) {
  const app = new Hono();

  app.get("/api/branding/icon", (c) => {
    const { buffer, mimeType } = serveAsset(
      env.ICON_PATH,
      "../../.github/assets/icon.png",
    );
    return c.body(new Uint8Array(buffer), 200, { "Content-Type": mimeType });
  });

  app.get("/api/branding/logo", (c) => {
    const { buffer, mimeType } = serveAsset(
      env.LOGO_PATH,
      "../../.github/assets/logo.png",
    );
    return c.body(new Uint8Array(buffer), 200, { "Content-Type": mimeType });
  });

  return app;
}
