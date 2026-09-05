<div align="center">

<img src=".github/assets/icon.png" width="120" alt="OpenMiQ-API icon">

<br />

<img src=".github/assets/logo.png" width="320" alt="OpenMiQ-API logo">

</div>

[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)](./LICENSE) [![Additional Terms](https://img.shields.io/badge/additional%20terms-important)](./ADDITIONAL_TERMS.md) [![Node](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](https://nodejs.org)

_[English](./README.md)_

メッセージをクォート画像に変換する、セルフホスト型の**Web API**です。Discord Bot版の[OpenMiQ](https://github.com/otnc/OpenMiQ)をもとに、Web API向けに改変しています — 詳細は[Credits](#credits)を参照してください。

## Discord Bot版との違い

- クォート生成にDiscordのメッセージ/ボタン操作は使いません。クォートはAPIキーを使って`POST /api/quote`（または`POST /api/fakequote`）で生成します。
- Discord OAuth2は**API Consoleのアカウント連携と管理者による承認**にのみ使用し、クォート投稿には使用しません。
- 本家Botには存在しないWeb Console（Discord連携、申請、APIキーの発行・管理）とAdminダッシュボード（申請の承認/却下、ユーザーの取消/BAN、全ユーザーのAPIキー管理）を追加しています。
- 申請の承認/却下は、Adminダッシュボードから行っても、審査用Webhookに投稿されるDiscordメッセージのボタンから行っても、どちらも同じ処理を呼び出すため状態が食い違うことはなく、再起動をまたいでもボタンは機能し続けます（Gatewayへの常駐接続は不要）。

## セットアップ

### 前提条件

- Node.js `24`（`.nvmrc`参照）と、[Corepack](https://nodejs.org/api/corepack.html)（Node同梱）経由の[pnpm](https://pnpm.io/): `corepack enable`を実行すれば、`package.json`の`packageManager`に固定されたバージョンが自動的に使われます
- Discordアプリケーション（OAuth2クライアントID/シークレット、Public Key）— Botユーザーは不要です。詳細は下記[Discordの設定](#discordの設定)を参照
- （任意・推奨）`hosted: true`の画像URL機能を使う場合はCloudflare R2バケット。使わない場合は`STORAGE_DRIVER=local`を設定してください

### クイックスタート

```bash
git clone https://github.com/otnc/OpenMiQ-API.git
cd OpenMiQ-API
pnpm install
cp .env.example .env   # 値を埋める。詳細は下記Configurationを参照
pnpm run db:migrate    # SQLiteスキーマを適用
pnpm run dev           # Turborepo経由でapps/apiとapps/webを同時起動
```

### Discordの設定

1. [Discord Developer Portal](https://discord.com/developers/applications)でアプリケーションを作成します。Botユーザーは不要です — 本サービスはDiscordをOAuth2ログインとHTTP Interactions Endpointのためだけに使用し、Gateway接続は行いません。
2. OAuth2タブで**Client ID**/**Client Secret**を確認し、リダイレクトURIに`<APP_BASE_URL>/api/auth/discord/callback`を追加します。
3. General InformationタブでPublic Key（Interactionsリクエストの署名検証に使用）を確認します。
4. Interactions Endpoint URLに`<APP_BASE_URL>/api/discord/interactions`を設定します — これはHTTPSで到達可能である必要があるため、デプロイ後に行ってください（[Deployment](#deployment)参照）。
5. 審査結果を投稿したいDiscordチャンネルにWebhookを作成し、そのURLを`DISCORD_REVIEW_WEBHOOK_URL`に設定します。

### 本番ビルド・デプロイ

```bash
pnpm run build          # Turborepo経由でapps/api・apps/webをビルド
pnpm run db:migrate     # 未適用のマイグレーションを適用
pnpm run pm2:start      # pm2で両プロセスを起動（ecosystem.config.cjs参照）
```

前提とするnginx + Let's Encrypt構成は[Deployment](#deployment)を参照してください。`.env`の`API_HOST`/`HOST`を`127.0.0.1`に設定し、nginx以外から両プロセスに直接到達できないようにしてください。

## Deployment

`apps/api`・`apps/web`の両方を1台のVPS上で動かし、nginxの背後でLet's Encrypt（`certbot`）によりTLS終端する構成を前提としています。

1. ドメインのDNS Aレコード（必要ならAAAAも）をサーバーのIPに向けます。
2. `.env`で`API_HOST=127.0.0.1`・`HOST=127.0.0.1`を設定し、nginx以外から両プロセスに直接到達できないようにした上で、nginxをインストールして`/api/`をapps/api（`API_PORT`、既定`9413`）に、それ以外をapps/web（`PORT`、既定`9414`）にルーティングします。
3. `sudo certbot --nginx -d <your-domain>`を実行して証明書を取得します。nginxプラグインがHTTPSのserver blockと80→443リダイレクトを自動で構成します。更新はインストール時に登録される`certbot.timer`/cronに任せます。
4. `pnpm run build && pnpm run pm2:start`で両プロセスを起動します。
5. ドメインが疎通するようになったら、HTTPSが前提の[Discordの設定](#discordの設定)手順（Interactions Endpoint URL、OAuth2リダイレクトURI）を完了させます。

詳しい手順は[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)を、そのままコピーして使えるnginx設定は[deploy-example/nginx/openmiq-api.conf](./deploy-example/nginx/openmiq-api.conf)を参照してください。

## pm2での運用

```bash
pnpm run pm2:start
pnpm run pm2:logs
pnpm run pm2:restart
pnpm run pm2:stop
```

`ecosystem.config.cjs`が`apps/api`と`apps/web`を2つのプロセスとして起動し、どちらもプロジェクトルートの同じ`.env`を読み込みます。

## Configuration

両アプリともプロジェクトルートの単一の`.env`（`.env.example`参照）を読み込みます — `apps/api/`や`apps/web/`ではなく、ルートに配置してください:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLiteファイルのパス（既定 `file:./data/db.sqlite`） |
| `SESSION_JWT_SECRET` | Web Console/AdminセッションJWTの署名鍵 |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord OAuth2アプリの認証情報 |
| `DISCORD_PUBLIC_KEY` | 受信したDiscord Interactionsリクエストの署名検証に使用 |
| `DISCORD_REVIEW_WEBHOOK_URL` | 審査用メッセージ（Approve/Deniedボタン付き）の投稿先Webhook URL |
| `ADMIN_DISCORD_IDS` | Adminダッシュボード/管理エンドポイントの利用を許可するDiscordユーザーIDのカンマ区切りリスト |
| `APP_BASE_URL` | 本サービス自身の公開URL。OAuth2コールバックとInteractions Endpointに使用 |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | APIキーごとの既定レート制限のウィンドウ（ms）と上限リクエスト数（既定 `60000`/`60`） |
| `ICON_PATH` / `LOGO_PATH` | `GET /api/branding/icon`/`logo`が配信するローカル画像パス。未設定時は同梱の`.github/assets/icon.png`/`logo.png`（再利用に関する制約は[License](#license)参照） |
| `REAPPLY_COOLDOWN_DAYS` | 却下/取消されたユーザーが再申請できるようになるまでの日数（既定 `1`） |
| `MAX_API_KEYS_PER_USER` | 1ユーザーが保持できる有効なAPIキー数の既定上限。管理者がユーザー個別に上書き可能（既定 `10`） |
| `STORAGE_DRIVER` | `hosted: true`時の画像保存先: `r2`（既定）または`local` |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | Cloudflare R2の接続情報。`STORAGE_DRIVER=r2`時は必須 |
| `STORAGE_LOCAL_DIR` | `STORAGE_DRIVER=local`選択時に使用する保存先ディレクトリ（既定 `./data/images`） |
| `HOSTED_IMAGE_TTL_HOURS` | `hosted: true`画像の有効期限（時間）。未設定時は無期限に保持 |
| `TERMS_VERSION` / `PRIVACY_VERSION` | 現在有効な利用規約・プライバシーポリシーのバージョン識別子。本文を変更したらインクリメントし、再同意を要求する |
| `DEFAULT_LOCALE` | Web UIの既定表示言語: `en`（既定）または`ja` |
| `API_PORT` / `API_HOST` | `apps/api`が待ち受けるポート番号/バインドアドレス（既定 `9413`/`0.0.0.0`）。素の`PORT`/`HOST`ではないのは、この`.env`を共有する`apps/web`側で`@sveltejs/adapter-node`がその素の名前を直接読むため |
| `API_BASE_URL` | `apps/web`のサーバーサイドが`apps/api`に到達するためのURL（既定 `http://localhost:9413`） |
| `PORT` / `HOST` | `apps/web`が待ち受けるポート番号/バインドアドレス（既定 `9414`/`0.0.0.0`）。本APIのコードからは参照せず、`@sveltejs/adapter-node`自身が直接読む変数名 |

## Author

otoneko. https://github.com/otnc

## Credits

- **OpenMiQ** — https://github.com/otnc/OpenMiQ — 本APIはDiscord Bot「OpenMiQ」（**otoneko.**作）をもとに、Web APIとして公開するための改変を加えたものです。
- **makeitaquote** — https://github.com/otnc/makeitaquote — 本APIが画像生成に使用しているライブラリです。
- Make it a Quote (Twitter) — https://twitter.com/MakeItAQuote
- Make it a Quote (Discord/Misskey/Bluesky) — https://miq.moe/
- アイコン・ロゴ: 原作者（OpenMiQの著作者でもあります）の許諾のもと使用しています — 詳細は[ADDITIONAL_TERMS.md](./ADDITIONAL_TERMS.md#4-brand-assets-githubassets)を参照してください。

## License

本プロジェクトは[GNU Affero General Public License v3.0 or later](./LICENSE)のもとでライセンスされており、OpenMiQ本家が付している[追加条項](./ADDITIONAL_TERMS.md)（AGPL-3.0 第7条）をそのまま引き継いでいます — 本APIはOpenMiQの改変版であるため、これらの条項は無改変のまま維持されます。

- **SPDX:** `AGPL-3.0-or-later`（AGPL-3.0 第7条に基づく追加条項付き）
- 本APIの改変版を配布または運用する場合、同じ追加条項により、改変版のソースをAGPL-3.0のもとで公開し、OpenMiQ（本家リポジトリURL: https://github.com/otnc/OpenMiQ）への帰属表示を[ADDITIONAL_TERMS.md](./ADDITIONAL_TERMS.md)に記載の方法で行う必要があります。

## クライアントライブラリ

[`@makeitaquote/openmiq`](https://www.npmjs.com/package/@makeitaquote/openmiq)（[ソース](./packages/openmiq)）は、本APIの`/api/quote`・`/api/fakequote`・`/api/usage`エンドポイント向けの、型安全な薄いクライアントです。姉妹パッケージ`@makeitaquote/voids`・`@makeitaquote/miqx`と同じFluentビルダー形式で、MITライセンスのもと本サーバー本体（AGPL-3.0-or-later）とは別に公開されています。使い方は同パッケージ自身のREADMEを参照してください。

## Legal

- 利用規約・プライバシーポリシーは、稼働中のインスタンスの`GET /api/legal/terms` / `GET /api/legal/privacy`から取得できます（Web ConsoleでもAPI Console申請前に表示されます）。
- API Console申請の提出には両方への同意が必要で、`TERMS_VERSION`/`PRIVACY_VERSION`が変更された際は再度同意が必要になります。
- **`hosted: true`で生成された画像はサーバー上に一時的に保存されるものであり、恒久的な保存を保証するものではありません** — 詳細は[Known v1 limitations](#known-v1-limitations)とプライバシーポリシーを参照してください。

## Known v1 limitations

- レート制限カウンターはSQLiteにローカル永続化されるため再起動をまたいで保持されますが、インスタンス単位のカウンターです。ロードバランサー配下で複数インスタンスを運用する場合は外部ストアが別途必要になります。
- 却下・取消されたユーザーは`REAPPLY_COOLDOWN_DAYS`の経過後にのみ再申請できます。BANされたユーザーは経過に関わらず再申請できません。同時に保留できる申請は1件のみです。
- 各ユーザーは`MAX_API_KEYS_PER_USER`件までの有効なAPIキーを保持できます（管理者がユーザー個別に上書き可能）。
- `hosted: true`の画像保存は、既定（`HOSTED_IMAGE_TTL_HOURS`未設定）では無期限に保持されますが、**恒久的な保存を保証するホスティングサービスではありません** — N時間後に自動削除したい場合は同変数を設定してください。
- UIの既定言語は英語です。ブラウザの言語設定から自動判定し、日本語以外は英語にフォールバックします。
- `/api/usage`および各キーの使用状況エンドポイントは、現在のウィンドウのカウンターと累計リクエスト数のみを返します。期間別の履歴は提供していません。

## Development

```bash
pnpm run dev           # Turborepo経由でapps/api + apps/webをホットリロード付きで起動
pnpm run lint          # eslint
pnpm run format        # prettier --write
pnpm run typecheck     # 全パッケージでtsc --noEmit
pnpm test              # vitest
```

`apps/api`起動中は`GET /api/docs`でAPIドキュメント（Swagger UI）を参照できます。
