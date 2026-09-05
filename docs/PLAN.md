# OpenMiQ-api 実装プラン

> **本ドキュメントは設計検討中のものであり、今後の実装・議論の進行に応じて内容が変更される可能性があります。**

詳細設計は [DESIGN.md](./DESIGN.md) を参照。ここではフェーズ分けした実装順序を示す。

## Phase 0: プロジェクト基盤
- pnpmワークスペース初期化（`apps/api`(Hono), `apps/web`(SvelteKit), `packages/db`, `packages/shared`, `packages/openmiq`）+ **Turborepo** 導入（`turbo.json`、`build`/`lint`/`test`/`dev`パイプライン、DESIGN.md §3.1/§13.4）
- `LICENSE` / `ADDITIONAL_TERMS.md` を OpenMiQ から無改変コピー
- `.github/assets/icon.png` / `logo.png` を OpenMiQ から著作権者本人の許諾のもとそのままコピー（DESIGN.md §0.1）
- `ICON_PATH`/`LOGO_PATH` 環境変数によるブランディング配信の仕組み（`GET /api/branding/icon`, `GET /api/branding/logo`）を実装。未設定時は `.github/assets/` の画像にフォールバックする
- ルートに `eslint.config.js` / `.prettierrc` / `.prettierignore` / `tsconfig.base.json`（**TypeScript `^6.0.3`**、DESIGN.md §3.1/§13.3）をOpenMiQ本家の設定を踏襲して用意し、`apps/web`向けに `eslint-plugin-svelte` / `svelte-eslint-parser` / `prettier-plugin-svelte` を追加（DESIGN.md §13）
- **Node/pnpmバージョン固定（決定、DESIGN.md §13.4）**: `.nvmrc`に`24`、`.npmrc`に`engine-strict=true`と`manage-package-manager-versions=false`、`package.json`に固定バージョンの`packageManager`を設定
- README作成（DESIGN.md §12の雛形どおり、OpenMiQ-misskeyに倣ったAuthor/Credits/Licenseの型 + 帰属表示3要素 + 改変明示文を含む）。**`README.md`（英語）と`README-ja.md`（日本語）の両方を作成**し、セットアップ手順（前提条件・クイックスタート・Discord設定・本番ビルド/デプロイ）を明確に記載する
- コーディング規約（コメント最小限、ドキュメント/コメント内で不自然な改行をしない、DESIGN.md §13.5）をCONTRIBUTING.md等に明記
- `docs/LIBRARIES.md` を実装しながら随時更新（確定バージョンの追記）
- Drizzle + **`better-sqlite3`**（決定: SQLite、`drizzle-kit`）導入、DESIGN.md §4のモデル（`rate_limit_counters`/`hosted_images`含む）を `drizzle/schema.ts` に反映、マイグレーション作成
- **`ransu`** 導入（決定）: DB主キーは`uuid.v7()`、APIキー本体・トークン類は`ransu/secure`の`token()`に統一し、`node:crypto`の`randomUUID`/`randomBytes`直書きを置き換える（DESIGN.md §3.1）
- Discord Developer PortalでApplication作成（OAuth2 Client、Botトークン、Public Key取得。Interactions Endpoint URL / OAuth2 Redirect URIはドメイン確定済みのため`https://miq.otnc.dev/api/discord/interactions`・`https://miq.otnc.dev/api/auth/discord/callback`をPhase 8のデプロイ完了後に登録、DESIGN.md §14.5）

## Phase 1: 認証基盤
- Discord OAuth2ログイン（Arctic利用、`GET /api/auth/discord`, `GET /api/auth/discord/callback`）
- セッションJWT発行（`hono/jwt`）・httpOnly Cookie設定・検証ミドルウェア（DBステータス再取得込み）
- `USER` テーブルとの紐付け、`GET /api/console/me` 実装
- Admin判定ミドルウェア（`ADMIN_DISCORD_IDS`）
- `USER.agreedTermsVersion`/`agreedPrivacyVersion`/`agreedAt`/`maxApiKeys`列を`drizzle/schema.ts`に追加（DESIGN.md §4, §16.4）

## Phase 2: 申請〜審査フロー
- 利用規約・プライバシーポリシー（EN/JA）を作成し `GET /api/legal/terms`,`GET /api/legal/privacy` で配信、Web UIに `/legal/terms`,`/legal/privacy` ページを実装（DESIGN.md §16）。`hosted: true`時のサーバー保存に関する明記を含める
- 申請フォームAPI `POST /api/console/applications`（20〜500字バリデーション(Zod)、IP取得、fingerprint受領、`agreedTermsVersion`/`agreedPrivacyVersion`必須チェック）。同意チェックボックス無しでは送信不可なフォームをWeb側にも実装。承認時に`USER.agreedTermsVersion`/`agreedPrivacyVersion`/`agreedAt`へ反映
- 再同意フロー（DESIGN.md §16.4、決定）: `POST /api/console/consent`実装、`TERMS_VERSION`/`PRIVACY_VERSION`不一致ユーザーへのWeb再同意画面、APIキー認証ミドルウェアでの`reconsent_required`(403)判定（§5.3）。同意しない/放置した場合はAPIキーが一時凍結されるが`status`は変更せず再申請も不要
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
- 審査中一覧・承認済み一覧（`maxApiKeys`個別上書き・同意待ちバッジ含む、§16.4）・拒否ユーザー一覧・BANリスト・APIキー一覧（全ユーザー横断、個別/一斉削除操作 + 使用状況表示つき）・監査ログ画面（SvelteKit + shadcn-svelte）
- Revoke / Ban / Unban アクション実装（`ADMIN_ACTION`記録）
- BAN済みdiscordId/email/ipのOAuth・申請提出時ブロック（再申請クールダウンより優先）
- i18n実装: `apps/web/src/lib/i18n/`に`Translations`オブジェクト（EN/JA、外部ライブラリ非依存、決定）+ ロケール判定（保存済み選択→`Accept-Language`/`navigator.language`→既定`en`）+ 切替UI（DESIGN.md §17）

## Phase 6: セキュリティ強化・仕上げ
- 監査ログ整備、ログのマスキング確認
- E2Eテスト（申請→承認→キー発行→API利用の一連の導線、Discordボタン再起動後動作）
- READMEに帰属表示・利用規約・セットアップ手順を整理

## Phase 7: npmラッパーパッケージ `@makeitaquote/openmiq`
- `packages/openmiq` を `@makeitaquote/voids`/`@makeitaquote/miqx` の構成（Biome, tsdown, vitest, examples/, CONTRIBUTING.md, ci.yml/release.yml）に倣ってセットアップ（DESIGN.md §15）
- `OpenMiQ` クラス（Fluentビルダー）、`endpoints.ts`/`errors.ts`/`types.ts`/`quote.ts`、`fromMessage`/`fromNote`/`fromTweet` アダプタを実装
- `v1.ts` に `/api/quote`,`/api/fakequote` 向けのリクエスト/レスポンス整形を実装、`client.ts`はその契約にのみ依存させる
- `toBuffer()`/`toURL()`/`getUsage()` を実装し、`examples/basic.ts` を用意
- MITライセンスで npm に `@makeitaquote/openmiq` として公開（GitHub Actions OIDC経由）

## Phase 8: 本番デプロイ（miq.otnc.dev）
- VPS等にNode.js(`>=24`)・pnpm・nginx・certbotをセットアップ
- DNS: `miq.otnc.dev` のAレコードをサーバーに向ける
- `certbot --nginx -d miq.otnc.dev` で証明書取得、自動更新（`certbot.timer`）を確認（DESIGN.md §14.4）
- nginx設定（`/api/` → apps/api、`/` → apps/web）を投入、80番はACMEチャレンジ経路+443へのリダイレクトのみ（DESIGN.md §14.3）
- `ecosystem.config.cjs` で `apps/api`/`apps/web` の2プロセスをpm2起動（127.0.0.1バインドのみ、外部非公開）
- Discord Developer Portalに本番URL（Interactions Endpoint URL・OAuth2 Redirect URI）を登録（DESIGN.md §14.5）
- 本番環境の`.env`（非コミット）に `ICON_PATH`/`LOGO_PATH` をOpenMiQ本家アセットのパスに設定（著作権者本人のデプロイのため、DESIGN.md §0.1）
- デプロイ手順書として上記を`docs/`配下に整理（Interactions Endpoint URL登録手順、Webhook作成手順を含む）

## 未確定事項（要ユーザー判断）
現時点で残っている大きな未確定事項はなし。細部の値・文言は実装時に随時`docs/`を更新する。

---

*本ドキュメントは設計検討中のものであり、今後の実装・議論の進行に応じて内容が変更される可能性があります。*
