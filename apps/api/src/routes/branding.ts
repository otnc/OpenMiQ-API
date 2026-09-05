import { readFileSync } from "node:fs";
import { extname, isAbsolute, resolve } from "node:path";
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

// No fallback to the bundled OpenMiQ icon/logo here on purpose: those assets
// identify the original project and its author specifically (ADDITIONAL_TERMS.md
// §4), and defaulting to them for every fork that doesn't set ICON_PATH/LOGO_PATH
// would put the original branding on deployments that aren't the original —
// including forks distributed under a different name (§2), which the terms
// don't allow at all. Every deployment, this project's own official one
// included, sets ICON_PATH/LOGO_PATH explicitly if it wants an icon/logo served.
function serveAsset(configuredPath: string | undefined) {
  if (!configuredPath) return null;
  // A relative value is resolved against the repo root, not apps/api's own
  // cwd — the shared .env these come from lives at the repo root (README.md
  // "Configuration"), so `ICON_PATH=.github/assets/icon.png` is what someone
  // reading that file would actually write. process.cwd() is apps/api
  // (repo_root/apps/api) in every way this server is ever started (dev,
  // `pnpm run start`, pm2 — see ecosystem.config.cjs), so going up two
  // levels reliably lands on the repo root.
  const path = isAbsolute(configuredPath)
    ? configuredPath
    : resolve(process.cwd(), "../..", configuredPath);
  const mimeType =
    MIME_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
  const buffer = readFileSync(path);
  return { buffer, mimeType };
}

export function createBrandingApp(env: Env) {
  const app = new Hono();

  app.get("/api/branding/icon", (c) => {
    const asset = serveAsset(env.ICON_PATH);
    if (!asset) return c.body(null, 404);
    return c.body(new Uint8Array(asset.buffer), 200, {
      "Content-Type": asset.mimeType,
    });
  });

  app.get("/api/branding/logo", (c) => {
    const asset = serveAsset(env.LOGO_PATH);
    if (!asset) return c.body(null, 404);
    return c.body(new Uint8Array(asset.buffer), 200, {
      "Content-Type": asset.mimeType,
    });
  });

  return app;
}
