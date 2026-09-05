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
  nav: { console: string; admin: string; logout: string };
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
  };
}

const en: Translations = {
  nav: { console: "Console", admin: "Admin", logout: "Log out" },
  home: {
    unlinked: "Link your Discord account to request API access.",
    unlinkedCta: "Sign in with Discord",
    pending:
      "Your application is under review. We'll notify you once an admin makes a decision.",
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
  },
  apply: {
    title: "Request API access",
    messageLabel: "Tell us how you plan to use this API (20-500 characters)",
    messageHint:
      "This is reviewed by an administrator before your account is approved.",
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
  },
};

const ja: Translations = {
  nav: { console: "コンソール", admin: "管理", logout: "ログアウト" },
  home: {
    unlinked: "Discordアカウントを連携してAPI利用を申請してください。",
    unlinkedCta: "Discordでログイン",
    pending: "審査中です。管理者が判断した後にお知らせします。",
    approved: "アカウントは承認済みです。以下からAPIキーを管理できます。",
    approvedCta: "APIキー管理へ",
    denied: "申請は却下されました。クールダウン期間経過後に再申請できます。",
    revoked:
      "アクセスが取り消されました。クールダウン期間経過後に再申請できます。",
    banned: "アカウントはBANされています。",
    reconsentRequired:
      "利用規約またはプライバシーポリシーが更新されました。内容をご確認の上、再度同意してください。",
    reconsentCta: "内容を確認して再同意する",
  },
  apply: {
    title: "API利用申請",
    messageLabel: "利用目的を教えてください（20〜500字）",
    messageHint: "この内容は管理者が承認前に確認します。",
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
  },
};

const dictionaries: Record<Locale, Translations> = { en, ja };

export function t(locale: Locale): Translations {
  return dictionaries[locale];
}
