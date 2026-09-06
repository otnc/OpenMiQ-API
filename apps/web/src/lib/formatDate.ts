import type { Locale } from "./i18n/index.ts";

const INTL_LOCALE: Record<Locale, string> = { en: "en-US", ja: "ja-JP" };

/**
 * Formats an ISO timestamp for display, explicitly in UTC — not the viewer's local time — so the same string renders during SSR and after hydration no matter where the server or the viewer's browser happen to be, and so it always means what it says regardless of who's reading it.
 */
export function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}
