import { readFileSync } from "node:fs";
import type { Env } from "../config/env.ts";
import { resolveAssetPath } from "../lib/assetPath.ts";

// Keyed by resolved path rather than a single once-computed value, so tests
// exercising several Env instances with different LOGO_PATHs in the same
// process don't see a stale result from the first one. Matches OpenMiQ's own
// watermarkLogo() convention (src/branding.ts in the sibling Discord bot
// repo): read once per path, `undefined` when unset or unreadable so callers
// fall back to their own default.
const cache = new Map<string, Buffer | null>();

export function getLogoWatermark(env: Env): Buffer | undefined {
  if (!env.LOGO_PATH) return undefined;
  const path = resolveAssetPath(env.LOGO_PATH);
  if (!cache.has(path)) {
    try {
      cache.set(path, readFileSync(path));
    } catch {
      cache.set(path, null);
    }
  }
  return cache.get(path) ?? undefined;
}
