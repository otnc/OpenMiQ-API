export type Locale = "en" | "ja";
export type LocalizedText = Record<Locale, string>;

// Every published version's full text is kept (not just the current one) so
// a user re-agreeing after a TERMS_VERSION/PRIVACY_VERSION bump can be shown
// a diff against the version they last agreed to, not just the new text on
// its own (DESIGN.md §16.4).
export const termsVersions: Record<string, LocalizedText> = {
  "1": {
    en: `# Terms of Service

OpenMiQ-API is a self-hosted quote-image generation API, based on OpenMiQ
(https://github.com/otnc/OpenMiQ) and licensed under the GNU Affero General
Public License v3.0 or later, with the additional terms in
ADDITIONAL_TERMS.md.

An API key is only issued after linking your Discord account and being
approved by an administrator. You must not share your API key with others,
and you must not use the service for abuse, spam, or any illegal purpose.
Violating these terms may result in immediate API key revocation and a ban.

This service is self-hosted and run without any uptime guarantee (no SLA).
Images generated with "hosted: true" are stored on the server temporarily
and are not a guaranteed permanent hosting service — see the Privacy Policy.

These terms may change over time; the current version is tracked by
TERMS_VERSION, and you will be asked to re-agree after a meaningful change.`,
    ja: `# 利用規約

OpenMiQ-APIは、OpenMiQ (https://github.com/otnc/OpenMiQ) をもとにしたセルフホスト型のクォート画像生成APIであり、GNU Affero General Public License v3.0 or laterおよびADDITIONAL_TERMS.mdに記載の追加条項のもとで提供されます。

APIキーは、Discordアカウントを連携し管理者の承認を得た場合にのみ発行されます。APIキーを第三者と共有すること、不正利用・スパム・違法な目的での利用は禁止します。本規約への違反はAPIキーの即時取消およびBANの対象となります。

本サービスはセルフホストで運用されており、稼働時間の保証(SLA)はありません。「hosted: true」で生成された画像はサーバー上に一時的に保存されるものであり、恒久的な保存を保証するホスティングサービスではありません。詳細はプライバシーポリシーを参照してください。

本規約は今後変更されることがあります。現在のバージョンはTERMS_VERSIONで管理され、重要な変更があった場合は再同意をお願いします。`,
  },
  "2": {
    en: `# Terms of Service

OpenMiQ-API is a self-hosted quote-image generation API, based on OpenMiQ
(https://github.com/otnc/OpenMiQ) and licensed under the GNU Affero General
Public License v3.0 or later, with the additional terms in
ADDITIONAL_TERMS.md.

An API key is only issued after linking your Discord account and being
approved by an administrator. You must not share your API key with others,
and you must not use the service for abuse, spam, or any illegal purpose.
Violating these terms may result in immediate API key revocation and a ban.

Each API key is subject to a rate limit, and its current usage can be
checked at any time via the API Console or GET /api/usage.

This service is self-hosted and run without any uptime guarantee (no SLA).
Images generated with "hosted: true" are stored on the server temporarily
and are not a guaranteed permanent hosting service — see the Privacy Policy.

These terms may change over time; the current version is tracked by
TERMS_VERSION, and you will be asked to re-agree after a meaningful change.`,
    ja: `# 利用規約

OpenMiQ-APIは、OpenMiQ (https://github.com/otnc/OpenMiQ) をもとにしたセルフホスト型のクォート画像生成APIであり、GNU Affero General Public License v3.0 or laterおよびADDITIONAL_TERMS.mdに記載の追加条項のもとで提供されます。

APIキーは、Discordアカウントを連携し管理者の承認を得た場合にのみ発行されます。APIキーを第三者と共有すること、不正利用・スパム・違法な目的での利用は禁止します。本規約への違反はAPIキーの即時取消およびBANの対象となります。

各APIキーにはレート制限が適用され、現在の利用状況はAPI Consoleまたは GET /api/usage からいつでも確認できます。

本サービスはセルフホストで運用されており、稼働時間の保証(SLA)はありません。「hosted: true」で生成された画像はサーバー上に一時的に保存されるものであり、恒久的な保存を保証するホスティングサービスではありません。詳細はプライバシーポリシーを参照してください。

本規約は今後変更されることがあります。現在のバージョンはTERMS_VERSIONで管理され、重要な変更があった場合は再同意をお願いします。`,
  },
};

export const privacyVersions: Record<string, LocalizedText> = {
  "1": {
    en: `# Privacy Policy

We collect: your Discord account information (ID, username, email), the IP
address and browser fingerprint recorded when you submit an application, the
text of your application, and API key usage counters.

This information is used for identity verification, application review, ban
enforcement, abuse prevention, and providing the service.

If you use the "hosted: true" image generation option, the generated image
is stored on our server-side storage (by default Cloudflare R2, or local
disk depending on configuration). This storage is not a guaranteed
permanent hosting service — images may be deleted depending on
HOSTED_IMAGE_TTL_HOURS or future operational changes.

Personal data other than ban records and audit logs is deleted when your
account is deleted. Data may be shared with Discord (OAuth2 and webhooks)
and, if STORAGE_DRIVER=r2, with Cloudflare.`,
    ja: `# プライバシーポリシー

収集する情報: Discordアカウント情報(ID・ユーザー名・メールアドレス)、申請時に記録されるIPアドレスおよびブラウザフィンガープリント、申請文章、APIキーの利用状況カウンター。

これらの情報は、本人確認・審査・BAN判定・不正利用防止・サービス提供の目的で利用します。

「hosted: true」で画像生成APIを利用した場合、生成された画像はサーバー側のストレージ(既定はCloudflare R2、設定によりローカルディスク)に保存されます。このストレージは永続的な保存を保証するものではなく、HOSTED_IMAGE_TTL_HOURSの設定や今後の運用方針の変更により削除されることがあります。

BAN記録・監査ログ以外の個人データは、アカウント削除時に削除します。データはDiscord(OAuth2・Webhook)、および STORAGE_DRIVER=r2 の場合はCloudflareと共有されることがあります。`,
  },
};
