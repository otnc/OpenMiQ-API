<!--
本ドキュメントは設計検討段階のものであり、実装の進行や仕様変更に伴い今後書き換えられる可能性があります。
-->

# OpenMiQ-api 使用ライブラリ一覧

[DESIGN.md](./DESIGN.md) §3 の選定理由の詳細版。実装が進むにつれて確定バージョンを追記していく。

## apps/api（Hono）

| ライブラリ | 用途 | 備考 |
| --- | --- | --- |
| `hono` | APIフレームワーク本体 | 全ルーティング・ミドルウェアの基盤 |
| `@hono/node-server` | Node.js上でHonoを実行するアダプタ | セルフホスト(Node >=24)向け |
| `@hono/zod-openapi` | Zodスキーマからのルート定義 + OpenAPI 3.1自動生成 | Swagger UIの定義元 |
| `@hono/swagger-ui` | Swagger UI配信 (`GET /api/docs`) | `@hono/zod-openapi` の出力を読む |
| `zod` | リクエスト/レスポンスのスキーマ検証 | `@hono/zod-openapi` の前提 |
| `hono/jwt` (Hono組込み) | セッションJWTの署名・検証 | 追加依存なし |
| `hono/cookie` (Hono組込み) | httpOnly Cookie操作 | 追加依存なし |
| `hono-rate-limiter` | APIキー単位のレート制限ミドルウェア | ストアは自前のSQLite永続実装（決定、DESIGN.md §5.4） |
| `@badgateway/oauth2-client`（決定・変更） | Discord OAuth2クライアント（authorization_code + PKCE） | 当初予定していた`arctic`は実装着手時点でnpm上deprecatedと判明したため不採用。依存ゼロ・4KB gzipの汎用OAuth2クライアントを採用（DESIGN.md §3.1） |
| `discord-interactions` | Discord Interactions署名検証(Ed25519) | `POST /api/discord/interactions` で使用 |
| `ofetch`（決定） | Discord Webhook実行/メッセージ編集のHTTPクライアント | 素の`fetch`から置き換え。`@discordjs/rest`は本サービスの呼び出し頻度には過剰と判断し不採用（比較はDESIGN.md §3.1/§6.4） |
| `drizzle-orm` | ORM | スキーマ定義・クエリ |
| `drizzle-kit` | マイグレーション生成CLI | 開発時のみ |
| `better-sqlite3` | DBドライバ（決定: SQLite） | 同期API・ネイティブアドオンだが実績豊富。`rate_limit_counters`/`hosted_images`テーブルもここに同居 |
| `makeitaquote` | クォート画像生成本体 | OpenMiQ本家からの継承依存 |
| `node:crypto`（標準モジュール） | APIキーのSHA-256ハッシュ化のみ | ID生成・トークン生成は`ransu`に置き換え済み（下記） |
| `ransu` / `ransu/secure`（決定） | DB主キー生成(`uuid.v7()`)、APIキー・セッション等の秘匿トークン生成(`token()`) | `@makeitaquote/utils`と同じ著者(otoneko.)によるゼロ依存乱数/ID生成ライブラリ。`node:crypto`の`randomUUID`/`randomBytes`直書きから置き換え（DESIGN.md §3.1） |
| `aws4fetch`（既定、決定） | Cloudflare R2（S3互換）への画像アップロード/取得/削除 | `hosted: true`モード用（DESIGN.md §8.6）。`@aws-sdk/client-s3`のフル依存を避けるためゼロ依存の軽量SigV4クライアントを採用。`STORAGE_DRIVER=local`選択時は不要 |
| `pino`（または `hono`組込みログ） | 構造化ログ | 機密情報マスキング設定込みで採用予定 |
| `diff`（決定） | 法的文書（利用規約/プライバシーポリシー）のバージョン間差分生成 | `diffWords()`で単語単位の差分を計算し、再同意画面（DESIGN.md §16.4）の変更点サマリ表示に使用。ゼロ依存・型定義同梱(`@types/diff`不要)。jsdiffプロジェクト本体で、他候補（自前実装、行単位diffのみのツール）より単語単位の粒度が文章の差分表示に適するため採用 |

**採用しなかった主な代替とその理由**は DESIGN.md §3.1 の比較表を参照（Fastify/Express, Prisma, PostgreSQL, discord.js, argon2/bcrypt, Redis, `@aws-sdk/client-s3`, Backblaze B2 等）。

## apps/web（SvelteKit）

| ライブラリ | 用途 | 備考 |
| --- | --- | --- |
| `@sveltejs/kit` | Web UIフレームワーク本体 | Console/Admin共通 |
| `@sveltejs/adapter-node` | セルフホスト用ビルドアダプタ | Next.js不使用の代替 |
| `tailwindcss` / `@tailwindcss/vite` | ユーティリティCSS（v4、Viteプラグイン方式） | 設定ファイル不要のCSSファーストconfig |
| `svelte-check` | Svelteコンポーネント込みの型検査 | `tsc`だけでは`.svelte`ファイルを検査できないため |
| `@fingerprintjs/fingerprintjs`（OSS版） | クライアント側フィンガープリント取得 | 申請フォームで`visitorId`を送信 |
| （追加ライブラリなし） | i18n（EN/JA） | 外部ライブラリを導入せず、OpenMiQ本家と同じ手法の自前`Translations`オブジェクトで実装（決定、DESIGN.md §17） |
| `bits-ui` | ヘッドレスUIプリミティブ | shadcn-svelteのコンポーネントが内部で使用 |
| `tailwind-variants` | コンポーネントのバリアント別クラス管理 | shadcn-svelteのコンポーネントが内部で使用 |
| `clsx` / `tailwind-merge` | クラス名結合・重複解決（`$lib/utils.ts`の`cn()`ヘルパー） | shadcn-svelteの標準ユーティリティ |
| `tw-animate-css` | Tailwind v4向けアニメーションユーティリティ | shadcn-svelteのCSSテーマが前提とする |
| `@lucide/svelte` | アイコンライブラリ | `components.json`の`iconLibrary: "lucide"`に対応 |

**`shadcn-svelte`導入時の実装メモ**: CLI(`shadcn-svelte@1.6.1`)の`init`は、テーマ・フォント・アイコン等を組み合わせた「プリセット」をshadcn-svelte.com上のビジュアルエディタで生成し文字列として渡すことを前提とした対話フローになっており、`--preset`フラグに直接名前を渡す旧来の使い方（`default`/`new-york`等のstyle名）は通らず、ブラウザの無いノンインタラクティブ環境では自動化できなかった。CLIのバンドル（`node_modules/shadcn-svelte/dist/schema-*.mjs`）からデフォルトの`components.json`の実体（style: `nova`, baseColor: `neutral`, iconLibrary: `lucide`等）を確認し、その内容で`components.json`を直接作成した上で`shadcn-svelte add <component>`を実行することで、対話フローを経ずに個々のコンポーネントを取得できた。`add`は`init`が本来生成する`$lib/utils.ts`（`cn()`ヘルパー）とテーマCSS変数を生成しないため、これらは`https://shadcn-svelte.com/registry/styles/nova/utils.json`・`https://shadcn-svelte.com/registry/colors/neutral.json`から実際のレジストリ応答を取得し、その内容をそのまま反映した。`zod`はサーバー側`apps/api`のバリデーションに一本化し、`apps/web`側はSvelteKitの`FormData`をそのまま扱う設計にしたため、`apps/web`自体は`zod`に直接依存しない。

## packages/db

| ライブラリ | 用途 |
| --- | --- |
| `drizzle-orm` | スキーマ定義・クエリビルダ（apps/apiと共有） |
| `better-sqlite3` | SQLiteドライバ（apps/apiと共有、決定） |

## packages/openmiq（npm公開: `@makeitaquote/openmiq`）

`@makeitaquote/voids` / `@makeitaquote/miqx`（同一著者の姉妹パッケージ）の構成を踏襲した独立ツールチェーン（DESIGN.md §15.2）。ルートのESLint/Prettier(§13)ではなく、姉妹パッケージと同じ **Biome** を採用する。

| ライブラリ | 用途 | 備考 |
| --- | --- | --- |
| `@makeitaquote/utils` | HTTPクライアント(`createClient`/`HTTPError`/`TimeoutError`)、バリデーション、エラー基底(`MiQError`)、Discord/MFM/Twitterテキスト処理 | voids/miqxと同じ共有基盤に依存し、車輪の再発明をしない |
| `@biomejs/biome` | Lint & Format | voids/miqxと同一運用（`check`/`ci`/`migrate`スクリプト） |
| `tsdown` | ビルド(ESM+CJS、`.d.mts`/`.d.cts`出力) | voids/miqxと同一 |
| `vitest` / `@vitest/coverage-v8` | テスト | voids/miqxと同一 |
| `typescript` | 型検査 | 独自の`tsconfig.json`（ルートの`tsconfig.base.json`とは別、voids/miqx同様パッケージ単体で完結） |
| `npm-check-updates` | 依存更新チェック | voids/miqxと同一 |

CI/公開ワークフロー（`.github/workflows/ci.yml` + `release.yml`、GitHub Actions OIDC経由のnpm publish）も姉妹パッケージの構成をそのまま流用する。

## 開発ツール（ルート、OpenMiQ本家踏襲 + Svelte拡張）

| ライブラリ | 用途 | 備考 |
| --- | --- | --- |
| `@eslint/js` | ESLint推奨ルール | OpenMiQ本家と同一 |
| `typescript-eslint` | TypeScript向けESLintルール | OpenMiQ本家と同一 |
| `eslint-config-prettier` | ESLintとPrettierの競合ルール無効化 | OpenMiQ本家と同一 |
| `globals` | ESLintのグローバル変数定義集 | OpenMiQ本家と同一 |
| `eslint-plugin-svelte` | Svelteファイル向けLintルール | 本プロジェクトでの追加分 |
| `svelte-eslint-parser` | `.svelte`ファイルのパーサ | 本プロジェクトでの追加分 |
| `prettier` | コードフォーマッタ | OpenMiQ本家と同一設定(`.prettierrc`) |
| `prettier-plugin-svelte` | `.svelte`ファイルのフォーマット | 本プロジェクトでの追加分 |
| `typescript`（`^6.0.3`、決定） | 型検査 | OpenMiQ本家・姉妹npmパッケージと統一。バージョン統一の理由はDESIGN.md §3.1/§13.3 |
| `vitest` | テストランナー | API/Web共通、OpenMiQ本家と同一 |
| `@testing-library/svelte` | Svelteコンポーネントテスト | 本プロジェクトでの追加分 |
| `turbo`（Turborepo、決定） | モノレポ全体のタスクパイプライン・キャッシュ | ルートから`turbo run build/lint/test/dev`で全ワークスペースを実行（DESIGN.md §3.1/§13.4） |
| `tsdown` | ビルド（`apps/api`のバンドル） | OpenMiQ本家と同一 |
| `tsx` | 開発時のTS直接実行(`dev`スクリプト) | OpenMiQ本家と同一 |
| `pm2` | プロセス管理（`ecosystem.config.cjs`） | OpenMiQ本家と同一運用方針 |
| `npm-check-updates` | 依存更新チェック(`checkupdates`) | OpenMiQ本家と同一 |

## バージョン方針

- Node.js: OpenMiQ本家と同じ `>=24` を `engines` に指定
- 各ライブラリは原則 **最新の安定版（メジャーバージョン固定、`^`指定）** を採用し、`checkupdates`（ncu）で定期的に更新確認する（OpenMiQ本家の運用方針を踏襲）
- 破壊的変更を伴うメジャーアップデートはPLAN.mdのフェーズ内で個別に検討する
- **`package.json`に書くバージョン番号は、実装時点でnpmに公開されている実際の最新版と一致させる**（`^`指定の範囲だけ広く取って古い番号を書き続けない）。実装中に`pnpm outdated -r`で全パッケージを確認し、`typescript`（本家との統一のため`6`系に固定、`7`系へは意図的に上げない）を除いて随時最新へ揃える

---

*本ドキュメントは設計検討中のものであり、今後の実装・議論の進行に応じて内容が変更される可能性があります。*
