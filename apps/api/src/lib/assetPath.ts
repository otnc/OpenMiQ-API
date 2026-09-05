import { isAbsolute, resolve } from "node:path";

// A relative value is resolved against the repo root, not the caller's own
// cwd — the shared .env these paths come from lives at the repo root
// (README.md "Configuration"), so `ICON_PATH=.github/assets/icon.png` is
// what someone reading that file would actually write. process.cwd() is
// apps/api (repo_root/apps/api) in every way this server is ever started
// (dev, `pnpm run start`, pm2 — see ecosystem.config.cjs), so going up two
// levels reliably lands on the repo root.
export function resolveAssetPath(configuredPath: string): string {
  return isAbsolute(configuredPath)
    ? configuredPath
    : resolve(process.cwd(), "../..", configuredPath);
}
