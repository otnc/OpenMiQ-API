import { redirect } from "@sveltejs/kit";
import { isLocale } from "$lib/i18n/index.ts";
import type { RequestHandler } from "./$types.ts";

const LOCALE_COOKIE = "openmiq_locale";

// A plain GET link, not a fetch call — matches how /api/auth/discord (login) and /api/auth/logout both work: a full-page navigation, no client JS required.
// Setting a cookie from a GET is fine here since it's a pure preference with no side effects beyond what the visitor already asked for.
export const GET: RequestHandler = ({ params, cookies, url }) => {
  if (isLocale(params.code)) {
    cookies.set(LOCALE_COOKIE, params.code, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  const redirectTo = url.searchParams.get("redirect");
  redirect(303, redirectTo && redirectTo.startsWith("/") ? redirectTo : "/");
};
