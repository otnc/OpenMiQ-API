export const SUPPORTED_LOCALES = ["en", "ja"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

// Picks the best supported locale from an Accept-Language header value.
// Falls back to DEFAULT_LOCALE (English) when nothing matches.
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(",")
    .map((part) => part.split(";")[0]!.trim().toLowerCase());
  for (const tag of tags) {
    if (tag.startsWith("ja")) return "ja";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}

interface Translations {
  meta: { description: string };
  nav: { console: string; admin: string; logout: string };
  theme: { system: string; light: string; dark: string };
  pagination: { previous: string; next: string; pageOf: string };
  language: { label: string };
  common: {
    discord: string;
    status: string;
    prefix: string;
    requests: string;
    remaining: string;
    revoked: string;
    reconsentPending: string;
    apiDocs: string;
    usage: string;
    resetsIn: string;
    unitDay: string;
    unitHour: string;
    unitMinute: string;
    noteLabel: string;
    discordInviteMessage: string;
    discordInviteCta: string;
  };
  home: {
    unlinked: string;
    unlinkedCta: string;
    pending: string;
    approved: string;
    approvedCta: string;
    denied: string;
    revoked: string;
    banned: string;
    reconsentRequired: string;
    reconsentCta: string;
    creditsTitle: string;
    sampleAlt: string;
  };
  legal: {
    termsTitle: string;
    privacyTitle: string;
  };
  footer: {
    terms: string;
    privacy: string;
    sourceCode: string;
    attribution: string;
  };
  apply: {
    title: string;
    messageLabel: string;
    messageHint: string;
    agreeTerms: string;
    agreePrivacy: string;
    submit: string;
  };
  apiKeys: {
    title: string;
    createNew: string;
    nameLabel: string;
    expiresAtLabel: string;
    noExpiry: string;
    create: string;
    regenerate: string;
    delete: string;
    deleteAll: string;
    copyNotice: string;
    copy: string;
  };
  admin: {
    title: string;
    applications: string;
    users: string;
    bans: string;
    auditLog: string;
    apiKeys: string;
    approve: string;
    deny: string;
    revoke: string;
    ban: string;
    unban: string;
    reasonLabel: string;
    maxApiKeysLabel: string;
    maxApiKeysUnlimited: string;
    save: string;
    revokeKey: string;
    deleteKey: string;
    deleteAllKeys: string;
    discordIdLabel: string;
    emailLabel: string;
    ipLabel: string;
    fingerprintLabel: string;
    confirmTitle: string;
    confirmMessage: string;
    confirmYes: string;
    confirmCancel: string;
  };
  playground: {
    title: string;
    description: string;
    apiKeyLabel: string;
    apiKeyPlaceholder: string;
    apiKeyOptionalPlaceholder: string;
    apiKeyHint: string;
    apiKeySharedHint: string;
    textLabel: string;
    usernameLabel: string;
    avatarLabel: string;
    themeLabel: string;
    themePlaceholder: string;
    fontLabel: string;
    fontPlaceholder: string;
    layoutLabel: string;
    layoutDefault: string;
    layoutSide: string;
    layoutNew: string;
    colorLabel: string;
    boldLabel: string;
    watermarkLabel: string;
    watermarkPlaceholder: string;
    fakeLabel: string;
    noHostedNote: string;
    send: string;
    sending: string;
    requestLabel: string;
    curlLabel: string;
    resultLabel: string;
    resultImageAlt: string;
    errorLabel: string;
    apiKeyRequired: string;
  };
}

const en: Translations = {
  meta: {
    description:
      "A self-hosted Web API that turns a message into a quote image over HTTP.",
  },
  nav: { console: "Console", admin: "Admin", logout: "Log out" },
  theme: { system: "System theme", light: "Light theme", dark: "Dark theme" },
  pagination: {
    previous: "Previous",
    next: "Next",
    pageOf: "Page {page} of {total}",
  },
  language: { label: "Language" },
  common: {
    discord: "Discord",
    status: "Status",
    prefix: "Prefix",
    requests: "Requests",
    remaining: "Remaining",
    revoked: "Revoked",
    reconsentPending: "Reconsent pending",
    apiDocs: "API docs",
    usage: "Usage",
    resetsIn: "Resets in {duration}",
    unitDay: "d",
    unitHour: "h",
    unitMinute: "m",
    noteLabel: "Note",
    discordInviteMessage:
      "Join our Discord server to chat with other users, get help, and hear about updates first.",
    discordInviteCta: "Join the Discord server",
  },
  home: {
    unlinked: "Link your Discord account to request API access.",
    unlinkedCta: "Sign in with Discord",
    pending:
      "Your application is under review. There's no notification when a decision is made — check back here to see your status.",
    approved: "Your account is approved. You can manage your API keys below.",
    approvedCta: "Go to API keys",
    denied:
      "Your application was denied. You can re-apply after the cooldown period.",
    revoked:
      "Your access was revoked. You can re-apply after the cooldown period.",
    banned: "Your account has been banned.",
    reconsentRequired:
      "The Terms of Service or Privacy Policy have changed. Please review and re-agree to continue using your API keys.",
    reconsentCta: "Review and re-agree",
    creditsTitle: "Credits",
    sampleAlt: "A sample quote image generated by this instance",
  },
  legal: {
    termsTitle: "Terms of Service",
    privacyTitle: "Privacy Policy",
  },
  footer: {
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    sourceCode: "Source code",
    attribution:
      "Based on OpenMiQ (a Discord bot) by otoneko., modified for a Web API.",
  },
  apply: {
    title: "Request API access",
    messageLabel: "Tell us how you plan to use this API (20-500 characters)",
    messageHint:
      "This is reviewed by an administrator before your account is approved. Backticks (`) and backslashes (\\) aren't allowed.",
    agreeTerms: "I agree to the Terms of Service",
    agreePrivacy: "I agree to the Privacy Policy",
    submit: "Submit application",
  },
  apiKeys: {
    title: "API keys",
    createNew: "Create a new key",
    nameLabel: "Name",
    expiresAtLabel: "Expires at",
    noExpiry: "Never expires",
    create: "Create",
    regenerate: "Regenerate",
    delete: "Delete",
    deleteAll: "Delete all keys",
    copyNotice: "Copy this key now — it will not be shown again.",
    copy: "Copy",
  },
  admin: {
    title: "Admin",
    applications: "Applications",
    users: "Users",
    bans: "Bans",
    auditLog: "Audit log",
    apiKeys: "API keys (all users)",
    approve: "Approve",
    deny: "Deny",
    revoke: "Revoke access",
    ban: "Ban",
    unban: "Unban",
    reasonLabel: "Reason",
    maxApiKeysLabel: "Max keys",
    maxApiKeysUnlimited: "Default",
    save: "Save",
    revokeKey: "Revoke",
    deleteKey: "Delete",
    deleteAllKeys: "Delete all",
    discordIdLabel: "Discord ID",
    emailLabel: "Email",
    ipLabel: "IP address",
    fingerprintLabel: "Fingerprint",
    confirmTitle: "Are you sure?",
    confirmMessage: "This action cannot be undone.",
    confirmYes: "Yes",
    confirmCancel: "Cancel",
  },
  playground: {
    title: "Playground",
    description:
      "Try generating a quote image right here, and see the exact request it sends — the same shape /api/quote and @makeitaquote/openmiq both expect.",
    apiKeyLabel: "API key",
    apiKeyPlaceholder: "openmiq_...",
    apiKeyOptionalPlaceholder:
      "openmiq_... (optional — leave blank to use the shared demo key)",
    apiKeyHint:
      "Only sent to this instance's own /api/quote — never stored anywhere but your browser.",
    apiKeySharedHint:
      "This instance provides a shared demo key for anonymous use, with its own low rate limit. Enter your own key instead for the full limit.",
    textLabel: "Text",
    usernameLabel: "Username",
    avatarLabel: "Avatar URL",
    themeLabel: "Theme",
    themePlaceholder: "e.g. sunset, or any CSS color",
    fontLabel: "Font",
    fontPlaceholder: "e.g. pop",
    layoutLabel: "Layout",
    layoutDefault: "Server default",
    layoutSide: "Side",
    layoutNew: "New",
    colorLabel: "Keep avatar in color",
    boldLabel: "Bold text",
    watermarkLabel: "Watermark override",
    watermarkPlaceholder: "Leave blank for the server's default",
    fakeLabel: "Mark as fake (POST /api/fakequote)",
    noHostedNote:
      "Images generated here are never uploaded or saved to server storage — hosted requests are disabled in the playground to prevent spam.",
    send: "Send request",
    sending: "Sending...",
    requestLabel: "Request",
    curlLabel: "As curl",
    resultLabel: "Result",
    resultImageAlt: "The generated quote image",
    errorLabel: "Error",
    apiKeyRequired: "An API key is required to send a request.",
  },
};

const ja: Translations = {
  meta: {
    description:
      "メッセージをクォート画像に変換する、セルフホスト型のWeb APIです。",
  },
  nav: { console: "コンソール", admin: "管理", logout: "ログアウト" },
  theme: {
    system: "システム設定に従う",
    light: "ライトテーマ",
    dark: "ダークテーマ",
  },
  pagination: {
    previous: "前へ",
    next: "次へ",
    pageOf: "{page} / {total}ページ",
  },
  language: { label: "言語" },
  common: {
    discord: "Discord",
    status: "ステータス",
    prefix: "プレフィックス",
    requests: "リクエスト数",
    remaining: "残り",
    revoked: "失効済み",
    reconsentPending: "再同意待ち",
    apiDocs: "APIドキュメント",
    usage: "使用量",
    resetsIn: "{duration}で回復",
    unitDay: "日",
    unitHour: "時間",
    unitMinute: "分",
    noteLabel: "注記",
    discordInviteMessage:
      "Discordサーバーに参加すると、他のユーザーとの交流やサポート、最新情報をいち早く受け取れます。",
    discordInviteCta: "Discordサーバーに参加する",
  },
  home: {
    unlinked: "Discordアカウントを連携してAPI利用を申請してください。",
    unlinkedCta: "Discordでログイン",
    pending:
      "審査中です。判断後の通知はありません — このページで状況をご確認ください。",
    approved: "アカウントは承認済みです。以下からAPIキーを管理できます。",
    approvedCta: "APIキー管理へ",
    denied: "申請は却下されました。クールダウン期間経過後に再申請できます。",
    revoked:
      "アクセスが取り消されました。クールダウン期間経過後に再申請できます。",
    banned: "アカウントはBANされています。",
    reconsentRequired:
      "利用規約またはプライバシーポリシーが更新されました。内容をご確認の上、再度同意してください。",
    reconsentCta: "内容を確認して再同意する",
    creditsTitle: "クレジット",
    sampleAlt: "このインスタンスで生成されたサンプルのクォート画像",
  },
  legal: {
    termsTitle: "利用規約",
    privacyTitle: "プライバシーポリシー",
  },
  footer: {
    terms: "利用規約",
    privacy: "プライバシーポリシー",
    sourceCode: "ソースコード",
    attribution:
      "Discord Bot「OpenMiQ」（otoneko.作）を、Web API向けに改変したものです。",
  },
  apply: {
    title: "API利用申請",
    messageLabel: "利用目的を教えてください（20〜500字）",
    messageHint:
      "この内容は管理者が承認前に確認します。バッククォート（`）とバックスラッシュ（\\）は使用できません。",
    agreeTerms: "利用規約に同意する",
    agreePrivacy: "プライバシーポリシーに同意する",
    submit: "申請を送信",
  },
  apiKeys: {
    title: "APIキー",
    createNew: "新しいキーを作成",
    nameLabel: "名前",
    expiresAtLabel: "有効期限",
    noExpiry: "無期限",
    create: "作成",
    regenerate: "再発行",
    delete: "削除",
    deleteAll: "すべて削除",
    copyNotice: "このキーは今だけ表示されます。必ずコピーしてください。",
    copy: "コピー",
  },
  admin: {
    title: "管理画面",
    applications: "申請一覧",
    users: "ユーザー一覧",
    bans: "BANリスト",
    auditLog: "監査ログ",
    apiKeys: "APIキー一覧（全ユーザー）",
    approve: "承認",
    deny: "却下",
    revoke: "アクセス取り消し",
    ban: "BAN",
    unban: "BAN解除",
    reasonLabel: "理由",
    maxApiKeysLabel: "上限数",
    maxApiKeysUnlimited: "既定値",
    save: "保存",
    revokeKey: "失効",
    deleteKey: "削除",
    deleteAllKeys: "すべて削除",
    discordIdLabel: "Discord ID",
    emailLabel: "メールアドレス",
    ipLabel: "IPアドレス",
    fingerprintLabel: "Fingerprint",
    confirmTitle: "本当によろしいですか？",
    confirmMessage: "この操作は取り消せません。",
    confirmYes: "はい",
    confirmCancel: "キャンセル",
  },
  playground: {
    title: "プレイグラウンド",
    description:
      "その場でクォート画像を生成して試せます。実際に送信されるリクエストの中身も確認できます — /api/quoteや@makeitaquote/openmiqが受け取るものと同じ形式です。",
    apiKeyLabel: "APIキー",
    apiKeyPlaceholder: "openmiq_...",
    apiKeyOptionalPlaceholder: "openmiq_...（任意 — 空欄で共有デモキーを使用）",
    apiKeyHint:
      "このインスタンス自身の/api/quoteにのみ送信されます — ブラウザ以外のどこにも保存されません。",
    apiKeySharedHint:
      "このインスタンスは匿名利用向けの共有デモキーを提供していますが、その利用枠は小さめです。フルの利用枠を使いたい場合は自分のAPIキーを入力してください。",
    textLabel: "テキスト",
    usernameLabel: "ユーザー名",
    avatarLabel: "アバターURL",
    themeLabel: "テーマ",
    themePlaceholder: "例: sunset、または任意のCSS色",
    fontLabel: "フォント",
    fontPlaceholder: "例: pop",
    layoutLabel: "レイアウト",
    layoutDefault: "サーバーの既定値",
    layoutSide: "サイド",
    layoutNew: "新レイアウト",
    colorLabel: "アバターをカラーのまま表示",
    boldLabel: "太字",
    watermarkLabel: "透かしの上書き",
    watermarkPlaceholder: "空欄でサーバーの既定値を使用",
    fakeLabel: "偽物として送信する（POST /api/fakequote）",
    noHostedNote:
      "ここで生成した画像はサーバーにアップロード・保存されません — スパム防止のため、プレイグラウンドではホスト（hosted）リクエストを無効化しています。",
    send: "リクエスト送信",
    sending: "送信中...",
    requestLabel: "リクエスト",
    curlLabel: "curlで見る",
    resultLabel: "結果",
    resultImageAlt: "生成されたクォート画像",
    errorLabel: "エラー",
    apiKeyRequired: "リクエストの送信にはAPIキーが必要です。",
  },
};

const dictionaries: Record<Locale, Translations> = { en, ja };

export function t(locale: Locale): Translations {
  return dictionaries[locale];
}
