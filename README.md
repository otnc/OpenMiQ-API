<div align="center">

<img src=".github/assets/icon.png" width="120" alt="OpenMiQ-API icon">

<br />

<img src=".github/assets/logo.png" width="320" alt="OpenMiQ-API logo">

</div>

[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)](./LICENSE) [![Additional Terms](https://img.shields.io/badge/additional%20terms-important)](./ADDITIONAL_TERMS.md) [![Node](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](https://nodejs.org)

_[日本語](./README-ja.md)_

A self-hosted **Web API** that turns a message into a quote image over HTTP. Based on [OpenMiQ](https://github.com/otnc/OpenMiQ) (a Discord bot), with modifications for a Web API — see [Credits](#credits).

## What's different from the Discord bot version

- No Discord message/button interaction for generating quotes — quotes are requested via `POST /api/quote` (or `POST /api/fakequote`) with an API key.
- Discord OAuth2 is used only for **API Console account linking and admin approval**, not for posting quotes.
- Adds a Web Console (Discord linking, applications, API key issuance/management) and an Admin dashboard (approve/deny applications, revoke/ban users, manage every user's API keys) that have no equivalent in the original bot.
- Application review can be approved/denied either from the Admin dashboard or from the Discord webhook message it posts (both act on the same underlying state, so the buttons stay in sync and keep working across restarts — no Gateway bot required).

## Setup

### Prerequisites

- Node.js `24` (see `.nvmrc`) and [pnpm](https://pnpm.io/) via [Corepack](https://nodejs.org/api/corepack.html) (bundled with Node): `corepack enable`, then `pnpm` uses the version pinned in `package.json`'s `packageManager` field automatically
- A Discord Application (OAuth2 Client ID/Secret, Public Key) — no bot user needed, see [Discord setup](#discord-setup) below
- (Optional but recommended) A Cloudflare R2 bucket, if you want `hosted: true` image URLs — otherwise set `STORAGE_DRIVER=local`

### Quick start

```bash
git clone https://github.com/otnc/OpenMiQ-API.git
cd OpenMiQ-API
pnpm install
cp .env.example .env   # fill in the values, see Configuration below
pnpm run db:migrate    # applies the SQLite schema
pnpm run dev           # runs apps/api and apps/web together via Turborepo
```

### Discord setup

1. Create an Application at the [Discord Developer Portal](https://discord.com/developers/applications). No bot user is required — this service uses Discord only for OAuth2 login and an HTTP Interactions Endpoint, never a Gateway bot connection.
2. Under OAuth2, note the **Client ID** / **Client Secret**, and add a redirect URI: `<APP_BASE_URL>/api/auth/discord/callback`.
3. Under General Information, note the **Public Key** (used to verify Interactions requests).
4. Set the Interactions Endpoint URL to `<APP_BASE_URL>/api/discord/interactions` — this requires the app to already be reachable over HTTPS, so do this after deploying (see [Deployment](#deployment)).
5. Create a Webhook in the Discord channel you want application reviews posted to, and put its URL in `DISCORD_REVIEW_WEBHOOK_URL`.

### Production build & deploy

```bash
pnpm run build          # builds apps/api and apps/web via Turborepo
pnpm run db:migrate     # applies any new migrations
pnpm run pm2:start      # starts both processes under pm2 (see ecosystem.config.cjs)
```

See [Deployment](#deployment) for the nginx + Let's Encrypt setup this assumes, and set `API_HOST`/`HOST` to `127.0.0.1` in `.env` so neither process is reachable except through nginx.

## Deployment

This is written for a single VPS running both `apps/api` and `apps/web` behind nginx, terminating TLS with Let's Encrypt (`certbot`).

1. Point your domain's DNS A (and AAAA, if applicable) record at the server's IP.
2. Set `API_HOST=127.0.0.1` and `HOST=127.0.0.1` in `.env` so neither process is reachable except through nginx, then install nginx and route `/api/` to `apps/api` (`API_PORT`, `9413` by default) and everything else to `apps/web` (`PORT`, `9414` by default).
3. Run `sudo certbot --nginx -d <your-domain>` to obtain a certificate; its nginx plugin wires up the HTTPS server block and the 80→443 redirect. Renewal is handled by the `certbot.timer`/cron entry it installs.
4. Run `pnpm run build && pnpm run pm2:start` to start both processes under pm2.
5. Finish the [Discord setup](#discord-setup) steps that require HTTPS (Interactions Endpoint URL, OAuth2 redirect URI) now that the domain resolves.

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the full runbook and a ready-to-copy nginx config at [deploy-example/nginx/openmiq-api.conf](./deploy-example/nginx/openmiq-api.conf).

## Running with pm2

```bash
pnpm run pm2:start
pnpm run pm2:logs
pnpm run pm2:restart
pnpm run pm2:stop
```

`ecosystem.config.cjs` runs `apps/api` and `apps/web` as two processes, both reading the same `.env` at the project root.

## Configuration

Both apps read from a single `.env` at the project root (see `.env.example`) — copy it there, not into `apps/api/` or `apps/web/`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file path (default `file:./data/db.sqlite`) |
| `SESSION_JWT_SECRET` | Signing secret for the Web Console/Admin session JWT |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord OAuth2 application credentials |
| `DISCORD_PUBLIC_KEY` | Verifies signatures on incoming Discord Interactions requests |
| `DISCORD_REVIEW_WEBHOOK_URL` | Webhook URL that application-review messages (with Approve/Deny buttons) are posted to |
| `ADMIN_DISCORD_IDS` | Comma-separated Discord user IDs allowed to use the Admin dashboard/endpoints |
| `APP_BASE_URL` | This service's own public URL, used for the OAuth2 callback and Interactions Endpoint |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Default per-API-key rate limit window (ms) and request cap (default `60000`/`60`) |
| `ICON_PATH` / `LOGO_PATH` | Local image paths served by `GET /api/branding/icon`/`logo` — a relative path is resolved against the project root, same as `.env` itself. **Unset = 404, on every deployment including the original one** — there's no fallback to the bundled `.github/assets/icon.png`/`logo.png`, since those identify the original OpenMiQ project and author specifically (see [License](#license) for the reuse restrictions on those files). Set these explicitly, even to that same path (`ICON_PATH=.github/assets/icon.png`), if you want an icon/logo served |
| `REAPPLY_COOLDOWN_DAYS` | Days a denied/revoked user must wait before re-applying (default `1`) |
| `MAX_API_KEYS_PER_USER` | Default max active API keys per user; an admin can override this per user (default `10`) |
| `STORAGE_DRIVER` | Where `hosted: true` images are stored: `r2` (default) or `local` |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | Cloudflare R2 credentials, required when `STORAGE_DRIVER=r2` |
| `STORAGE_LOCAL_DIR` | Directory used when `STORAGE_DRIVER=local` (default `./data/images`) |
| `HOSTED_IMAGE_TTL_HOURS` | Hours before a `hosted: true` image expires. Unset = kept indefinitely |
| `TERMS_VERSION` / `PRIVACY_VERSION` | Current Terms/Privacy version identifiers; bump when the text changes to require re-consent |
| `DEFAULT_LOCALE` | Default Web UI language: `en` (default) or `ja` |
| `API_PORT` / `API_HOST` | Port/bind address `apps/api` listens on (default `9413`/`0.0.0.0`). Named `API_PORT`/`API_HOST`, not `PORT`/`HOST`, because `apps/web` shares this same file and `@sveltejs/adapter-node` reads those plain names itself |
| `API_BASE_URL` | Where `apps/web`'s server side reaches `apps/api` (default `http://localhost:9413`) |
| `PORT` / `HOST` | Port/bind address `apps/web` listens on (default `9414`/`0.0.0.0`) — read directly by `@sveltejs/adapter-node`, not by this API's own code |

## Author

otoneko. https://github.com/otnc

## Credits

- **OpenMiQ** — https://github.com/otnc/OpenMiQ — this API is based on OpenMiQ (a Discord bot) by **otoneko.**, with modifications to expose it as a Web API.
- **makeitaquote** — https://github.com/otnc/makeitaquote — the library this API renders images with.
- Make it a Quote (Twitter) — https://twitter.com/MakeItAQuote
- Make it a Quote (Discord/Misskey/Bluesky) — https://miq.moe/
- Icon/Logo: used with permission of their original author (also the author of OpenMiQ) — see [ADDITIONAL_TERMS.md](./ADDITIONAL_TERMS.md#4-brand-assets-githubassets).

## License

This project is licensed under the [GNU Affero General Public License v3.0 or later](./LICENSE), carrying forward the [additional terms](./ADDITIONAL_TERMS.md) OpenMiQ itself is licensed under (AGPL-3.0 Section 7) — preserved here, unmodified, since this API is a modified version of that software.

- **SPDX:** `AGPL-3.0-or-later` (with additional terms under AGPL-3.0 Section 7)
- If you distribute or run a modified version of _this_ API, the same additional terms require you to make your modified source available under AGPL-3.0 and to display attribution to OpenMiQ (original repository URL: https://github.com/otnc/OpenMiQ) as described in [ADDITIONAL_TERMS.md](./ADDITIONAL_TERMS.md).

## Client library

[`@makeitaquote/openmiq`](https://www.npmjs.com/package/@makeitaquote/openmiq) ([source](./packages/openmiq)) is a thin, type-safe client for this API's `/api/quote`, `/api/fakequote` and `/api/usage` endpoints, in the same fluent-builder style as its sibling packages `@makeitaquote/voids` and `@makeitaquote/miqx`. MIT-licensed and published separately from the AGPL-3.0-or-later server itself — see its own README for usage.

## Legal

- Terms of Service / Privacy Policy are served by the running instance at `GET /api/legal/terms` / `GET /api/legal/privacy` (and shown in the Web Console before an application can be submitted).
- Agreement to both is required before submitting an API Console application, and again whenever `TERMS_VERSION`/`PRIVACY_VERSION` changes.
- **Images generated with `hosted: true` are stored on the server temporarily and are not guaranteed to persist** — see [Known v1 limitations](#known-v1-limitations) and the Privacy Policy.

## Known v1 limitations

- The rate-limit counter is persisted locally in SQLite (so it survives a restart), but is still per-instance — running multiple instances behind a load balancer would need an external store instead.
- A denied or revoked user can re-apply only after `REAPPLY_COOLDOWN_DAYS` has passed since the denial/revocation; a banned user can never re-apply regardless. Only one pending application is allowed at a time.
- Each user can hold up to `MAX_API_KEYS_PER_USER` active API keys (an admin can override this per user).
- `hosted: true` image storage is **not a guaranteed permanent hosting service**, even though images are kept indefinitely by default (`HOSTED_IMAGE_TTL_HOURS` unset) — set it to auto-delete after N hours instead.
- The UI defaults to English; language auto-detects from the browser and falls back to English otherwise.
- `/api/usage` and per-key usage endpoints only expose the current window's counter and a lifetime request count — no historical per-period breakdown.

## Development

```bash
pnpm run dev           # apps/api + apps/web via Turborepo, both with hot reload
pnpm run lint          # eslint
pnpm run format        # prettier --write
pnpm run typecheck     # tsc --noEmit across all packages
pnpm test              # vitest
```

API docs (Swagger UI) are served at `GET /api/docs` while `apps/api` is running.
