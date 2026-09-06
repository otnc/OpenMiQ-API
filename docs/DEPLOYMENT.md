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
| `STORAGE_DRIVER` / `R2_*` | `hosted: true`の画像URL機能を使うならCloudflare R2の接続情報を設定（既定`r2`のまま使うなら必須。取得方法は下記2.1）。使わないなら`STORAGE_DRIVER=local`に変更 |
| `ICON_PATH` / `LOGO_PATH` | **未設定だと`GET /api/branding/icon`/`logo`が404を返す**（自動フォールバックは無い）。著作権者本人（otoneko.）自身のデプロイでアイコン・ロゴを表示したい場合も、`ICON_PATH=.github/assets/icon.png`のように明示的に設定すること（相対パスは`.env`と同じくリポジトリルート基準）。それ以外の人が自分のブランドとしてセルフホストする場合は、自分の画像のパスをこの2変数に設定する（`ADDITIONAL_TERMS.md` §4の制約に従うこと） |

### 2.1 Cloudflare R2の準備（`STORAGE_DRIVER=r2`を使う場合）

`hosted: true`で生成した画像の保存先。無料枠が大きくエグレス課金が無いためこれを既定にしている（DESIGN.md §8.6）。まだCloudflareアカウントを持っていない場合は先に[cloudflare.com](https://dash.cloudflare.com/sign-up)で作成しておく。

1. **`R2_ACCOUNT_ID`の確認**: Cloudflareダッシュボード → 左メニュー **R2 Object Storage** を開く。右側のサイドバーに表示される「Account ID」をコピーする（ダッシュボードのトップページ右側にも同じIDが表示されている）。
2. **バケットの作成**: R2の画面で **Create bucket** → バケット名を入力（例: `openmiq-api`）→ ロケーションは既定（Automatic）のままで作成する。このバケット名がそのまま`R2_BUCKET`の値になる。
3. **APIトークンの発行**: R2の画面右上（または左メニュー）の **Manage API Tokens** → **Create API Token** を開く。
   - Token名は任意（例: `openmiq-api`）
   - Permissions: **Object Read & Write**
   - **Specify bucket(s)** で手順2のバケットのみに絞る（アカウント全体への権限は不要 — 最小権限にする）
   - **Create API Token** を押すと、この画面でのみ**Access Key ID**と**Secret Access Key**が表示される。閉じると二度と表示されないので、この場でコピーして`.env`に貼り付ける（`R2_ACCESS_KEY_ID`・`R2_SECRET_ACCESS_KEY`）
4. **（任意）自動削除の設定**: `.env`の`HOSTED_IMAGE_TTL_HOURS`を設定して画像を自動削除したい場合は、R2バケットの **Settings** → **Object lifecycle rules** で同じ日数のルールを追加しておく（実際の削除はR2側のライフサイクルルールに任せる設計、DESIGN.md §8.6）。`HOSTED_IMAGE_TTL_HOURS`を未設定のままにする場合はこの手順は不要（無期限保持）。

バケットの公開アクセス（Public Development URLやカスタムドメイン）は**設定不要** — 画像は`apps/api`が署名付きリクエストで取得し`GET /api/images/:id`経由で配信するため、R2バケット自体を外部に公開する必要はない。

## 3. ビルド

```bash
pnpm run build
```

`apps/api/dist/index.mjs`・`apps/web/build/index.js`が生成される。

## 4. nginx + certbot

1. `.env`と同じパターンで、[`deploy-example/`](../deploy-example/)（gitコミット済みの雛形）を`deploy/`（gitignore対象、実際の設定を書き込む場所）にコピーしてから編集する:
   ```bash
   cp -r deploy-example deploy
   $EDITOR deploy/nginx/openmiq-api.conf   # miq.example.com を自分のドメインに置き換える
   sudo cp deploy/nginx/openmiq-api.conf /etc/nginx/sites-available/openmiq-api
   sudo ln -s /etc/nginx/sites-available/openmiq-api /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
   `deploy-example/nginx/openmiq-api.conf`は意図的に80番ポートの`server`ブロックのみを持つ（`/api/`・`/`のプロキシ設定込み）。443ブロックを手書きする必要はない — 次のcertbotが自動生成する。
2. 証明書取得:
   ```bash
   sudo certbot --nginx -d miq.example.com
   ```
   certbotのnginxプラグインが、上記80番ブロックを複製して`ssl_certificate`等を追加した443番ブロックをその場で生成し、元の80番ブロックは443へのリダイレクトに書き換える。
3. 自動更新の確認: `sudo certbot renew --dry-run`（更新自体はインストール時に登録される`certbot.timer`/cronが行う）

## 5. Anubis（任意・AIスクレイパー対策）

[Anubis](https://anubis.techaro.lol/)は、Webページの前段に立ってJSチャレンジ（Proof of Work）を課すことで、AI企業等のスクレイパーBotを遮断するリバースプロキシ。nginx（TLS終端・ルーティング）と`apps/web`（SvelteKitのWeb UI）の間に挟んで使う。

**`apps/api`（`/api/`配下）はAnubisの対象外とすること。** APIキーで叩く外部クライアント（`@makeitaquote/openmiq`等のnpmパッケージ、`/playground`ページ自身のサーバーサイドプロキシ含む）はJSチャレンジを解けないため、Anubisを通すとAPI自体が使えなくなる。上記§4のnginx設定は`/api/`を直接`apps/api`（9413番）へ、`/`のみをAnubis経由で`apps/web`（9414番）へ振り分ける構成になっている。

1. AnubisはDockerを使わないこのデプロイに合わせ、ネイティブパッケージ（`.deb`/`.rpm`）でインストールする。[GitHub Releases](https://github.com/TecharoHQ/anubis/releases)から自分のOS/アーキテクチャ向けのパッケージをダウンロードし、`sudo apt install ./anubis-*.deb`（またはrpm系なら`dnf`/`yum`/`rpm`）でインストールする。インストール後、`systemctl`のテンプレートユニット`anubis@.service`と、デフォルト設定`/etc/anubis/default.env`が配置される（詳細は[Anubis公式のnative install手順](https://anubis.techaro.lol/docs/admin/native-install)を参照）。
2. このデプロイ用の設定ファイルを作成する:
   ```bash
   sudo cp deploy/anubis/openmiq-web.env /etc/anubis/openmiq-web.env
   ```
   [`deploy-example/anubis/openmiq-web.env`](../deploy-example/anubis/openmiq-web.env)（`deploy/`にコピー済みのはず。まだなら`cp -r deploy-example deploy`）が`TARGET=http://127.0.0.1:9414`（`apps/web`）・`BIND=127.0.0.1:8923`（TCP、ループバックのみ）を既定値としており、上記§4のnginx設定の`upstream anubis`ブロックとポート番号が一致するようになっている。Unixソケットにしたい場合は要注意 — ネイティブパッケージの`anubis@.service`は`DynamicUser=yes`で動くため、ソケットファイルの所有グループが実行毎に変わる一時的なものになり、nginx側をそのグループに追加できない。両方変更する場合は必ず一致させること。
3. サービスを起動:
   ```bash
   sudo systemctl enable --now anubis@openmiq-web.service
   ```
4. 動作確認:
   ```bash
   curl http://127.0.0.1:9998/metrics   # Anubis自身のメトリクス（METRICS_BIND）
   ```
   ブラウザで自分のドメインを開き、一瞬チャレンジページが表示されてから元のページに遷移すれば成功。`/api/`配下（`curl`で`/api/about`等）はチャレンジ無しで即座に応答することも確認しておく。

Anubisを使わない場合はこの節をスキップし、[`deploy-example/nginx/openmiq-api.conf`](../deploy-example/nginx/openmiq-api.conf)内のコメントに従って`location /`の`proxy_pass`を`http://127.0.0.1:9414;`に戻す（`upstream anubis`ブロックごと削除して構わない）。

## 6. pm2でプロセス起動

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

## 7. Discord Developer Portalへの登録

ドメインが疎通するようになった後（HTTPSでアクセスできる状態になってから）:

1. [Discord Developer Portal](https://discord.com/developers/applications)で対象のアプリケーションを開く
2. **General Information** → Interactions Endpoint URLに `https://miq.example.com/api/discord/interactions` を設定して保存する。Discordはこの時点で実際にPINGインタラクションを送って検証するため、`apps/api`が起動済みで`DISCORD_PUBLIC_KEY`が正しく設定されている必要がある（保存が失敗する場合はpm2のログでエラーを確認）
3. **OAuth2** → Redirectsに `https://miq.example.com/api/auth/discord/callback` を追加して保存する。**`miq.example.com`は必ず自分の実際のドメイン（`APP_BASE_URL`の値）に読み替えること** — サーバーは`redirect_uri`として`${APP_BASE_URL}/api/auth/discord/callback`を1文字違わず送るため、`.env`の`APP_BASE_URL`とここに登録するURLのプロトコル・ドメイン・パス・末尾スラッシュが完全一致していないと、Discordが`OAuth2 redirect_uri is invalid`で拒否する
4. まだ済んでいなければ、審査用Webhookを作成し、そのURLを`.env`の`DISCORD_REVIEW_WEBHOOK_URL`に設定してpm2を再起動する（[README.mdのDiscord setup](../README.md#discord-setup)手順1〜5と同じ内容）。**チャンネル設定のIntegrations → Webhooksから作成しないこと** — その方法で作ったWebhookは「application-owned」にならず、Approve/DenyボタンをDiscordが黙って無視する（メッセージ自体はエラー無く届くため気づきにくい）。必ずBotトークンで`POST /channels/{channel.id}/webhooks`を叩いて作成する（README手順5参照）

## 8. 動作確認

- `https://miq.example.com/api/about` — 帰属表示が返ることを確認
- `https://miq.example.com/` — Web Consoleのトップページが表示されることを確認
- `https://miq.example.com/api/docs` — Swagger UIが表示されることを確認
- `https://miq.example.com/playground` — フォームに入力して送信し、生成された画像と、実際に送信されたリクエストJSONの両方が表示されることを確認（APIキーが必要 — Web Console `/console/api-keys`から発行）
- Discordアカウントでログイン → 申請提出 → 審査用Webhookにメッセージが届き、Approve/Denyボタンが**実際に表示され**機能することを確認（PLAN.md Phase 6参照）。ボタンが表示されない場合は上記手順4の「application-ownedなWebhookか」を再確認する
