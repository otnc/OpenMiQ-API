# OpenMiQ-api 実装プラン

> **本ドキュメントは設計検討中のものであり、今後の実装・議論の進行に応じて内容が変更される可能性があります。**

詳細設計は [DESIGN.md](./DESIGN.md) を参照。ここではフェーズ分けした実装順序を示す。

## Phase 0: プロジェクト基盤
- pnpmワークスペース初期化（`apps/api`(Hono), `apps/web`(SvelteKit), `packages/db`, `packages/shared`, `packages/openmiq`）+ **Turborepo** 導入（`turbo.json`、`build`/`lint`/`test`/`dev`パイプライン、DESIGN.md §3.1/§13.4）
- `LICENSE` / `ADDITIONAL_TERMS.md` を OpenMiQ から無改変コピー
- `.github/assets/icon.png` / `logo.png` を OpenMiQ から著作権者本人の許諾のもとそのままコピー（DESIGN.md §0.1）
- `ICON_PATH`/`LOGO_PATH` 環境変数によるブランディング配信の仕組み（`GET /api/branding/icon`, `GET /api/branding/logo`、実装済み）を実装。未設定時は `.github/assets/` の画像にフォールバックする（拡張子からContent-Typeを判定、実機動作確認済み）
- ルートに `eslint.config.js` / `.prettierrc` / `.prettierignore` / `tsconfig.base.json`（**TypeScript `^6.0.3`**、DESIGN.md §3.1/§13.3）をOpenMiQ本家の設定を踏襲して用意し、`apps/web`向けに `eslint-plugin-svelte` / `svelte-eslint-parser` / `prettier-plugin-svelte` を追加（DESIGN.md §13）
- **Node/pnpmバージョン固定（決定、DESIGN.md §13.4）**: `.nvmrc`に`24`、`.npmrc`に`engine-strict=true`と`manage-package-manager-versions=false`、`package.json`に固定バージョンの`packageManager`を設定
- README作成（実装済み）: DESIGN.md §12の雛形どおり、OpenMiQ-misskeyに倣ったAuthor/Credits/Licenseの型 + 帰属表示3要素 + 改変明示文を含む`README.md`（英語）・`README-ja.md`（日本語）を作成。前提条件・クイックスタート・Discord設定・本番ビルド/デプロイ・Configuration（全環境変数）・Known v1 limitationsを記載。作成時に`DISCORD_BOT_TOKEN`が実装のどこからも参照されていない（設計時点の想定と異なりWebhook自体のURL経由でメッセージ編集しておりBotトークン不要）ことに気づき、必須環境変数から削除した（`apps/api/src/config/env.ts`・`.env.example`・DESIGN.md §11/§12を修正）
- コーディング規約（コメント最小限、ドキュメント/コメント内で不自然な改行をしない、DESIGN.md §13.5）をCONTRIBUTING.md等に明記
- `docs/LIBRARIES.md` を実装しながら随時更新（確定バージョンの追記）
- Drizzle + **`better-sqlite3`**（決定: SQLite、`drizzle-kit`）導入、DESIGN.md §4のモデル（`rate_limit_counters`/`hosted_images`含む）を `drizzle/schema.ts` に反映、マイグレーション作成
- **`ransu`** 導入（決定）: DB主キーは`uuid.v7()`、APIキー本体・トークン類は`ransu/secure`の`token()`に統一し、`node:crypto`の`randomUUID`/`randomBytes`直書きを置き換える（DESIGN.md §3.1）
- Discord Developer PortalでApplication作成（OAuth2 Client、Botトークン、Public Key取得。Interactions Endpoint URL / OAuth2 Redirect URIはドメイン確定済みのため`https://miq.otnc.dev/api/discord/interactions`・`https://miq.otnc.dev/api/auth/discord/callback`をPhase 8のデプロイ完了後に登録、DESIGN.md §14.5）

## Phase 1: 認証基盤
- Discord OAuth2ログイン（`@badgateway/oauth2-client`利用、`GET /api/auth/discord`, `GET /api/auth/discord/callback`。DESIGN.md §3.1で`arctic`(deprecated判明)→自前実装→本ライブラリの順で変更を決定）
- セッションJWT発行（`hono/jwt`）・httpOnly Cookie設定・検証ミドルウェア（DBステータス再取得込み）
- `USER` テーブルとの紐付け、`GET /api/console/me` 実装
- Admin判定ミドルウェア（`ADMIN_DISCORD_IDS`）
- `USER.agreedTermsVersion`/`agreedPrivacyVersion`/`agreedAt`/`maxApiKeys`列を`drizzle/schema.ts`に追加（DESIGN.md §4, §16.4）

## Phase 2: 申請〜審査フロー
- 利用規約・プライバシーポリシー（EN/JA）を作成し `GET /api/legal/terms`,`GET /api/legal/privacy` で配信、Web UIに `/legal/terms`,`/legal/privacy` ページを実装（DESIGN.md §16）。`hosted: true`時のサーバー保存に関する明記を含める
- 申請フォームAPI `POST /api/console/applications`（20〜500字バリデーション(Zod)、IP取得、fingerprint受領、`agreedTermsVersion`/`agreedPrivacyVersion`必須チェック）。同意チェックボックス無しでは送信不可なフォームをWeb側にも実装。承認時に`USER.agreedTermsVersion`/`agreedPrivacyVersion`/`agreedAt`へ反映
- 再同意フロー（DESIGN.md §16.4、実装済み）: `POST /api/console/consent`、`GET /api/console/me`の`reconsentRequired`フラグ、APIキー認証ミドルウェアでの`reconsent_required`(403)判定（§5.3）、Web側の再同意バナー・`/console/reconsent`ページ、Admin一覧の「reconsent pending」バッジまで実装・実機動作確認済み。同意しない/放置した場合はAPIキーが一時凍結されるが`status`は変更せず再申請も不要。法的文書のバージョン別本文履歴（`apps/api/src/legal/content.ts`）と`diff`パッケージによる差分生成（`apps/api/src/legal/diff.ts`、`GET /api/legal/{terms,privacy}/diff`）も実装済みで、再同意画面は既定で差分表示、トグルで全文表示に切り替え可能（実機動作確認済み）
- 再申請クールダウン判定（`REAPPLY_COOLDOWN_DAYS`、DESIGN.md §6.6）: `denied`は直近Applicationの`reviewedAt`、`revoked`は`ADMIN_ACTION`の該当`revoke`の`createdAt`を起点に経過日数を検証し、未経過ならエラーで残り日数を返す。BANは常に優先して即拒否
- 申請の悪用防止（DESIGN.md §6.5、決定）: 既存の`pending`Applicationがあれば新規申請を409で拒否、`POST /api/console/applications`にセッション/IP単位のレート制限を適用
- Discord Webhook送信サービスを**`ofetch`**で実装（素の`fetch`から置き換え。429時は`Retry-After`に従い最大2回リトライ。`@discordjs/rest`は呼び出し頻度に対し過剰と判断し不採用、DESIGN.md §6.4）。`DISCORD_REVIEW_WEBHOOK_URL`はクライアントに一切露出しない
- `POST /api/discord/interactions` エンドポイント（`discord-interactions`で署名検証、`c.req.text()`によるrawBody処理、PING応答）
- Approve/Deny処理（DBトランザクション、多重クリック対策、UPDATE_MESSAGEでボタンdisabled化）
- Web管理画面からのApprove/Deny（Discordメッセージも `PATCH` で追従編集）
- 動作確認: プロセスを再起動してもボタンが機能することを確認

## Phase 3: APIキー基盤
- `POST /api/console/api-keys`（`name`/`expiresAt`(null可)指定、複数作成可、平文は一度だけ返却、SHA-256でhash保存）。作成時に有効なキー数を`MAX_API_KEYS_PER_USER`／`USER.maxApiKeys`と比較し上限超過なら409（DESIGN.md §4補足、決定）
- `GET /api/console/api-keys` / `PATCH /api/console/api-keys/:id` / `POST /api/console/api-keys/:id/regenerate` / `DELETE /api/console/api-keys/:id`（個別削除） / `DELETE /api/console/api-keys`（**一斉削除、決定**）
- 管理者用: `GET /api/admin/api-keys` / `POST /api/admin/api-keys/:id/revoke` / `DELETE /api/admin/api-keys/:id`（個別） / `DELETE /api/admin/api-keys?userId=`（**指定ユーザーの一斉削除、決定**） / `PATCH /api/admin/users/:id`（`maxApiKeys`個別上書き）
- APIキー認証ミドルウェア（`X-API-Key`検証 + 有効期限チェック + revoked/User状態チェック）
- レート制限（`hono-rate-limiter` + 自前のSQLite永続カウンタストア`rate_limit_counters`、DESIGN.md §5.4で決定。プロセス再起動をまたいでカウントを維持）
- 使用状況可視化: 読み取り専用カウンタストア実装、`RateLimit-*` レスポンスヘッダ付与、`GET /api/usage` / `GET /api/console/api-keys/:id/usage` / `GET /api/admin/api-keys/:id/usage`（DESIGN.md §5.4）

## Phase 4: クォート生成API + Swagger + 画像ストレージ
- `makeitaquote` を利用した `renderService`（本家 `src/render.ts` のロジックを移植・API向けに関数化）
- `POST /api/quote`, `POST /api/fakequote`（`@hono/zod-openapi`のルート定義として実装。既定はPNGバイナリを1リクエストで返却、`hosted: true`時のみ一時保存して`{url}`を返す。DESIGN.md §8.5で確定）
- `ImageStore`抽象化: **既定`r2`**実装を`aws4fetch`（`AwsClient`）で実装し、`local`実装も用意（DESIGN.md §8.6）。`hosted_images`テーブルによる期限管理を実装
- `GET /api/images/:id`（`hosted: true`で生成した画像の配信。既定`HOSTED_IMAGE_TTL_HOURS`未設定＝無期限、設定時のみ期限切れ後404）+ 設定時のみ動作する期限切れ画像の定期削除ジョブ
- `@hono/swagger-ui` 導入、`/api/docs` 公開（hosted画像が一時保存であり永続保存を保証しない旨をエンドポイント説明に明記）
- `GET /api/about`（帰属表示）実装

## Phase 5: 管理画面（Admin UI）・i18n
- Web ConsoleとAdmin UIをSvelteKit内で**別ルートグループ**（`(console)`/`(admin)`）としてページ分離（決定、DESIGN.md §7）
- 審査中一覧・ユーザー一覧（`maxApiKeys`個別上書き・同意待ちバッジ含む、§16.4）・BANリスト・APIキー一覧（全ユーザー横断、個別/一斉削除操作 + 使用状況表示つき、実装済み・実機動作確認済み）・監査ログ画面（SvelteKit + shadcn-svelte）を単一の`/admin`ページにセクション分けして実装。ユーザー一覧はステータス問わず全件表示のため、拒否/取消/BAN済みユーザーもここからそのままBANできる
- Revoke / Ban / Unban アクション実装（`ADMIN_ACTION`記録）
- BAN済みdiscordId/email/ipのOAuth・申請提出時ブロック（再申請クールダウンより優先）
- i18n実装: `apps/web/src/lib/i18n/`に`Translations`オブジェクト（EN/JA、外部ライブラリ非依存、決定）+ ロケール判定（保存済み選択→`Accept-Language`/`navigator.language`→既定`en`）+ 切替UI（DESIGN.md §17）

## Phase 6: セキュリティ強化・仕上げ
- 監査ログ整備（`GET /api/admin/audit-log`・Admin UI、実装済み）
- **ログのマスキング確認（実施済み・実際に不具合を発見して修正）**: `apps/api/src`内の`console.*`呼び出しを全数調査したところ、`discordInteractions.ts`の`console.error("Failed to update Discord review message", error)`が1件のみ存在し、この`error`が`discordWebhookService.ts`内で`ofetch`が投げる生の`FetchError`だった。`ofetch`のエラーメッセージにはリクエストURLがそのまま含まれ、`DISCORD_REVIEW_WEBHOOK_URL`はDiscordのWebhookトークンをパスに含む秘匿URL（`https://discord.com/api/webhooks/<id>/<token>`）であるため、Webhook呼び出し失敗時にトークンがそのままログに出力される実害を実機検証で確認した（`node --input-type=module`でofetch単体を実行し、`console.error`出力にトークン文字列が含まれることを確認）。`requestWithRetry`のリトライ打ち切り時の`throw error`を、ステータスコードのみを含むサニタイズ済みメッセージの新規`Error`を投げる形に修正（`cause`は付けない — Node の`console.error`は`Error.cause`も出力するため、`cause`に元の`error`を入れると同じ経路で漏洩する）。回帰テスト`apps/api/src/services/discordWebhookService.test.ts`で、失敗時のエラーメッセージにWebhookトークンが含まれないことを固定化
- テストスイート（実装済み・実機動作確認済み）: `apps/api`に`vitest`導入。`packages/db/src/testDb.ts`（インメモリDB+マイグレーション適用）、`apps/api/tests/helpers/`（`buildTestEnv`・ファイルDB版`createTestDbFile`・セッションCookie生成・Discord Ed25519署名生成）を整備し、単体テスト（`apiKeyCrypto`/`rateLimiter`/`legal diff`/`consentService`/`banService`/`applicationService`）と、実際にHTTPリクエストを`app.request()`で送るE2E/結合テスト（申請→承認→キー発行→API利用の一連の導線、`GET /api/legal/*`、`GET /api/branding/*`）を実装。`apps/api/src/index.ts`から`createApp(env)`を`apps/api/src/app.ts`に分離し、テストが本番と同一のルーティング構成を`.request()`で直接叩けるようにした
- Discordボタンの再起動後動作（実装済み・実機動作確認済み）: `apps/api/tests/discordInteractions.test.ts`で、`createApp(env)`を2回呼び出して「再起動」を模擬し、1回目のプロセスで作成した申請に対し2回目の（＝別インスタンスの）appから送ったボタン操作が正しく処理されることを確認。Interactionsエンドポイントがプロセス内状態を一切持たずDBのみに依存している設計（HTTP Interactions方式）を裏付ける
- READMEに帰属表示・利用規約・セットアップ手順を整理（実装済み、`README.md`/`README-ja.md`）
- **`.env`の配置に関する修正**: 当初`apps/api/.env`・`apps/web/.env`のように各app個別に`.env`を置く実装になっていたが、README/DESIGN.mdが元々想定していた「プロジェクトルート直下に単一の`.env`」（`cp .env.example .env`を一度実行するだけで済む構成）と食い違っていたため、`apps/api`/`apps/web`双方の`dev`/`start`スクリプトとecosystem.config.cjsを修正し、実際にルート直下の単一`.env`を両アプリが読む構成に統一（実機動作確認済み）。この過程で以下の副次的な不具合も発見・修正:
  - `apps/api`の`start`スクリプトに`--env-file-if-exists`が付いておらず、本番起動時に環境変数を一切読み込めていなかった
  - `tsdown`のビルド成果物は`dist/index.js`ではなく`dist/index.mjs`（`format: "esm"`のため）だったが、`package.json`の`main`/`start`とecosystem.config.cjsは`dist/index.js`を参照しており、本番起動が常に失敗する状態だった
  - `apps/api`の`serve()`呼び出しが`hostname`オプションを渡しておらず、`ecosystem.config.cjs`で`HOST: "127.0.0.1"`を設定していても実際には全インターフェースにbindしていた（DESIGN.md §14.2の意図と不一致）。`API_HOST`環境変数を追加し実際にbindアドレスを制御できるよう修正
  - `apps/api`と`apps/web`が同じ`.env`を共有する際、`PORT`という素の名前を両方で使うと値を奪い合う（`@sveltejs/adapter-node`が`PORT`/`HOST`を直接読むため）ことが判明し、`apps/api`側の変数を`API_PORT`/`API_HOST`にリネーム

## Phase 7: npmラッパーパッケージ `@makeitaquote/openmiq`（実装済み・実機動作確認済み）
- `packages/openmiq` を `@makeitaquote/voids`/`@makeitaquote/miqx` の構成（Biome, tsdown, vitest, examples/, CONTRIBUTING.md）に倣ってセットアップ（DESIGN.md §15）。両パッケージの実際の公開物（npm packからdist/型定義を取得）を参照し、規約を細部まで踏襲した
- `OpenMiQ` クラス（Fluentビルダー）、`endpoints.ts`/`errors.ts`/`types.ts`/`quote.ts`、`fromMessage`/`fromNote`/`fromTweet` アダプタを実装。`@makeitaquote/utils`のHTTPクライアント・エラー基底・バリデーションヘルパー・Discord/MFM/Twitterテキスト処理をそのまま再利用し、車輪の再発明をしていない
- `payload.ts`（miqxの`v1.ts`に相当。OpenMiQ-API自体にAPIバージョンの概念が無いため`v1`という名前は使わない）に `/api/quote`/`/api/fakequote`/`/api/usage` 向けのリクエスト/レスポンス整形（`packages/shared/src/quote.ts`の実スキーマに1:1対応）を実装、`client.ts`はその契約（`pathFor()`/`buildPayload()`/`parseHostedResult()`/`parseUsageResult()`）にのみ依存させる
- `toBuffer()`/`toBuffer({hosted:true})`/`toURL()`/`getUsage()`/`setFake()`（`/api/fakequote`への切り替え）を実装し、`examples/basic.ts` を用意。単体テスト28件（`quote.ts`の正規化・`fromMessage`アダプタ・`client.ts`のHTTPリクエスト整形とエラーマッピング、`fetch`をスタブ化して検証）に加え、実際に`apps/api`のサーバーを起動しAPIキーを発行した上でこのパッケージの`toBuffer()`/`toURL()`/`toBuffer({hosted:true})`/`getUsage()`/`setFake()`/エラー系すべてを実リクエストで動作確認済み
- MITライセンス（`LICENSE`同梱）。npm公開自体（GitHub Actions OIDC経由）は`.github/workflows/openmiq-release.yml`を用意したが、npm側でのTrusted Publisher設定（アカウント操作）は別途必要 — 未実施
- **DESIGN.md §15.3の設計からの補正**: 実装時（および実装後のレビュー）に判明した差分は4点。(1) 実際の`/api/quote`スキーマには`setDisplayName`/`setFlip`/`setWatermark`に対応するフィールドが無い（`authorName`一本で、fakequoteは別エンドポイント呼び出しで表現）ため、それらのビルダーメソッドは実装せず、代わりに`setFake()`でエンドポイント切り替えを表現した。(2) `.github/workflows/`はDESIGN.mdの雛形では`packages/openmiq/.github/workflows/`に置く想定だったが、GitHub Actionsはリポジトリルートの`.github/workflows/`しか見ないため（本パッケージは単独リポジトリではなくモノレポ内サブパッケージ）、`paths`フィルタ付きでリポジトリルート直下（`openmiq-ci.yml`/`openmiq-release.yml`）に配置した。(3) OpenMiQ-API自体は（miqxの`/v1/make`のような）APIバージョンの概念を持たないため、`v1.ts`という姉妹パッケージ由来のファイル名は誤解を招くとして`payload.ts`にリネームした。(4) `DEFAULT_BASE_URL`（既定`https://miq.otnc.dev`）をvoids/miqx同様に組み込む設計だったが、OpenMiQ-APIは各自がセルフホストするものであり単一の「公式ホスト」を前提にできないため撤回し、`baseUrl`を必須パラメータ（既定値なし）に変更した
- **APIキーのプレフィックス変更**: `apps/api`側のAPIキー生成プレフィックスを`miq_live_`から`openmiq_`に変更（`apps/api/src/lib/apiKeyCrypto.ts`）。本パッケージ自体はプレフィックスを検証しないため影響なし
- **副次的に発見・修正したバグ**: `drizzle/drizzle.config.ts`が`DATABASE_URL`の相対パスをdrizzle-kitの実行時cwd（リポジトリルート、`pnpm run db:migrate`実行時）基準で解決していた一方、`apps/api`自身は常に`apps/api`をcwdとして起動する（pm2・`pnpm run dev`/`start`いずれも）ため、`DATABASE_URL=file:./data/db.sqlite`のような相対パスが両者で異なるファイルを指してしまい、マイグレーションが実際にアプリが読むDBに適用されない不具合があった。`drizzle.config.ts`側で明示的に`apps/api`ディレクトリを基準に解決するよう修正し、実際にサーバーを起動・マイグレーション適用・本パッケージからの実リクエストが同一DBに対して機能することを確認して発見した

## Phase 8: 本番デプロイ（miq.otnc.dev）
- デプロイ手順書 [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) を作成済み（実装済み）: 以下の各項目を上から実行できる形にまとめ、[`deploy/nginx/openmiq-api.conf`](../deploy/nginx/openmiq-api.conf)（実装済み・コピー可能な設定ファイル）も用意した。**実際のVPS/DNS/Discord Developer Portalへの操作自体は著作権者本人の環境で行う必要があるため未実施**（このドキュメントとエージェントには実サーバーへのアクセス権限が無い）
  - VPS等にNode.js(`>=24`)・pnpm・nginx・certbotをセットアップ
  - DNS: `miq.otnc.dev` のAレコードをサーバーに向ける
  - `certbot --nginx -d miq.otnc.dev` で証明書取得、自動更新（`certbot.timer`）を確認（DESIGN.md §14.4）
  - nginx設定（`/api/` → apps/api、`/` → apps/web）を投入、80番はACMEチャレンジ経路+443へのリダイレクトのみ（DESIGN.md §14.3、`deploy/nginx/openmiq-api.conf`）
  - `ecosystem.config.cjs` で `apps/api`/`apps/web` の2プロセスをpm2起動。`.env`の`API_HOST`/`HOST`を`127.0.0.1`に設定して外部非公開にする（既定`0.0.0.0`は開発時の利便性のためのものなので、本番では明示的に変更が必要。DESIGN.md §14.2）
  - Discord Developer Portalに本番URL（Interactions Endpoint URL・OAuth2 Redirect URI）を登録（DESIGN.md §14.5）
  - **実装時の補正**: 本番環境の`.env`に`ICON_PATH`/`LOGO_PATH`を明示的に設定する必要は無いと判明した — 未設定時のフォールバック先である`.github/assets/icon.png`/`logo.png`自体が既にOpenMiQ本家の正規アセット（著作権者本人の許諾のもと同梱、§0.1）であるため、著作権者本人によるmiq.otnc.devデプロイではこの2変数を空のまま（デフォルト）にしておけば意図通りに動作する

## 未確定事項（要ユーザー判断）
現時点で残っている大きな未確定事項はなし。細部の値・文言は実装時に随時`docs/`を更新する。

---

*本ドキュメントは設計検討中のものであり、今後の実装・議論の進行に応じて内容が変更される可能性があります。*
