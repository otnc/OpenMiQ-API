<!--
本ドキュメントは実装の進行に伴い今後書き換えられる可能性があります。
-->

# デプロイ手順書

[DESIGN.md](./DESIGN.md) §14 の設計を、実際に本番デプロイする際にそのまま上から実行できるチェックリストにしたもの。PLAN.md Phase 8に対応する。

以下はドメインを`miq.example.com`とした例で書いているので、自分のドメインに読み替えること。

## 0. 前提条件

- Node.js `24`以上、[pnpm](https://pnpm.io/)（`corepack enable`で`package.json`の`packageManager`のバージョンが自動的に使われる）
- nginx、certbot（`python3-certbot-nginx`）
- [pm2](https://pm2.io/)（`npm install -g pm2`等でグローバルインストール）
- サーバーのグローバルIPに向けたドメイン（Aレコード、必要ならAAAAも）

## 1. リポジトリの取得・依存関係のインストール・DB準備

```bash
git clone https://github.com/otnc/OpenMiQ-API.git
cd OpenMiQ-API
pnpm install
cp .env.example .env   # このあと値を埋める（§2参照）
pnpm run db:migrate
```

## 2. `.env`（プロジェクトルート、非コミット）の設定

[README.mdのConfiguration節](../README.md#configuration)にある全変数のうち、本番で特に注意が必要なもの:

| 変数 | 本番での設定方針 |
| --- | --- |
| `SESSION_JWT_SECRET` | ランダムな十分に長い文字列に設定する（`openssl rand -hex 32`等） |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_PUBLIC_KEY` | Discord Developer Portal（§6）で取得した値。アプリケーション自体は事前に作成しておく必要がある — [README.mdのDiscord setup](../README.md#discord-setup)手順1〜3を参照 |
| `DISCORD_REVIEW_WEBHOOK_URL` | 審査結果を投稿するDiscordチャンネルのWebhook URL（[README.mdのDiscord setup](../README.md#discord-setup)手順5を参照） |
| `ADMIN_DISCORD_IDS` | 管理画面を使う自分自身（および他の管理者）のDiscordユーザーIDをカンマ区切りで |
| `APP_BASE_URL` | `https://miq.example.com`（自分のドメインの場合は読み替え） |
| `API_BASE_URL` | `APP_BASE_URL`と同じ値でよい（`apps/web`から`apps/api`への到達に使う。同一サーバー上でnginxが両方を配信するため） |
| `API_HOST` / `HOST` | **`127.0.0.1`に設定する**（既定`0.0.0.0`は開発時の利便性のためのものなので、本番では必ず変更し、nginx以外から両プロセスに直接到達できないようにする。DESIGN.md §14.2） |
| `STORAGE_DRIVER` / `R2_*` | `hosted: true`の画像URL機能を使うならCloudflare R2の接続情報を設定（既定`r2`のまま使うなら必須）。使わないなら`STORAGE_DRIVER=local`に変更 |
| `ICON_PATH` / `LOGO_PATH` | 著作権者本人（otoneko.）自身がデプロイする場合は設定不要 — 未設定時のフォールバック先である`.github/assets/icon.png`/`logo.png`自体が既にOpenMiQ本家の正規アセットのため。それ以外の人が自分のブランドとしてセルフホストする場合は、自分の画像に差し替えるためにこの2変数を設定すること（`ADDITIONAL_TERMS.md` §4の制約に従うこと） |

## 3. ビルド

```bash
pnpm run build
```

`apps/api/dist/index.mjs`・`apps/web/build/index.js`が生成される。

## 4. nginx + certbot

1. [`deploy/nginx/openmiq-api.conf`](../deploy/nginx/openmiq-api.conf)を配置する（自分のドメインでセルフホストする場合はファイル内の`miq.example.com`をすべて置き換える）:
   ```bash
   sudo cp deploy/nginx/openmiq-api.conf /etc/nginx/sites-available/openmiq-api
   sudo ln -s /etc/nginx/sites-available/openmiq-api /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
   このファイルは意図的に80番ポートの`server`ブロックのみを持つ（`/api/`・`/`のプロキシ設定込み）。443ブロックを手書きする必要はない — 次のcertbotが自動生成する。
2. 証明書取得:
   ```bash
   sudo certbot --nginx -d miq.example.com
   ```
   certbotのnginxプラグインが、上記80番ブロックを複製して`ssl_certificate`等を追加した443番ブロックをその場で生成し、元の80番ブロックは443へのリダイレクトに書き換える。
3. 自動更新の確認: `sudo certbot renew --dry-run`（更新自体はインストール時に登録される`certbot.timer`/cronが行う）

## 5. pm2でプロセス起動

```bash
pnpm run pm2:start
pnpm run pm2:logs     # 起動確認
```

`ecosystem.config.cjs`が`apps/api`・`apps/web`をルートの`.env`を読んだ状態で起動する（DESIGN.md §14.2）。`pnpm run pm2:restart`/`pm2:stop`で再起動・停止。

サーバー再起動後もpm2が自動でプロセスを起動するようにする場合:
```bash
pm2 startup   # 表示されたコマンドをsudoで実行
pm2 save
```

## 6. Discord Developer Portalへの登録

ドメインが疎通するようになった後（HTTPSでアクセスできる状態になってから）:

1. [Discord Developer Portal](https://discord.com/developers/applications)で対象のアプリケーションを開く
2. **General Information** → Interactions Endpoint URLに `https://miq.example.com/api/discord/interactions` を設定して保存する。Discordはこの時点で実際にPINGインタラクションを送って検証するため、`apps/api`が起動済みで`DISCORD_PUBLIC_KEY`が正しく設定されている必要がある（保存が失敗する場合はpm2のログでエラーを確認）
3. **OAuth2** → Redirectsに `https://miq.example.com/api/auth/discord/callback` を追加して保存する
4. まだ済んでいなければ、審査結果を投稿するDiscordチャンネルでWebhookを作成し（チャンネル設定 → Integrations → Webhooks → New Webhook）、そのURLを`.env`の`DISCORD_REVIEW_WEBHOOK_URL`に設定してpm2を再起動する（[README.mdのDiscord setup](../README.md#discord-setup)手順1〜5と同じ内容）

## 7. 動作確認

- `https://miq.example.com/api/about` — 帰属表示が返ることを確認
- `https://miq.example.com/` — Web Consoleのトップページが表示されることを確認
- `https://miq.example.com/api/docs` — Swagger UIが表示されることを確認
- Discordアカウントでログイン → 申請提出 → 審査用Webhookにメッセージが届き、Approve/Denyボタンが機能することを確認（実機確認済みの導線、PLAN.md Phase 6参照）
