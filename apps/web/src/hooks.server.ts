import type { Handle } from "@sveltejs/kit";
import {
  isLocale,
  localeFromAcceptLanguage,
  DEFAULT_LOCALE,
} from "$lib/i18n/index.ts";

const LOCALE_COOKIE = "openmiq_locale";

export const handle: Handle = async ({ event, resolve }) => {
  const cookieLocale = event.cookies.get(LOCALE_COOKIE);
  const locale =
    cookieLocale && isLocale(cookieLocale)
      ? cookieLocale
      : localeFromAcceptLanguage(event.request.headers.get("accept-language"));

  event.locals.locale = locale ?? DEFAULT_LOCALE;
  event.locals.cookie = event.request.headers.get("cookie");

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace("%lang%", event.locals.locale),
  });
};
