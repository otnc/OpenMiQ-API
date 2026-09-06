import type { LayoutServerLoad } from "./$types.ts";
import { apiJson } from "$lib/server/api.ts";

export interface ConsoleMe {
  discordId: string;
  discordUsername: string;
  email: string;
  avatarUrl: string | null;
  status: "unlinked" | "pending" | "approved" | "denied" | "revoked" | "banned";
  isAdmin: boolean;
  reconsentRequired: boolean;
  termsVersion: string;
  privacyVersion: string;
  agreedTermsVersion: string | null;
  agreedPrivacyVersion: string | null;
}

export const load: LayoutServerLoad = async (event) => {
  const { status, data } = await apiJson<ConsoleMe>(event, "/api/console/me");
  return {
    locale: event.locals.locale,
    me: status === 200 ? data : null,
    // Absolute, not relative — og:image/og:url need a full URL for link
    // previews to resolve it. event.url.origin reflects the real public
    // domain here since nginx forwards the original Host header (§14.3).
    siteUrl: event.url.origin,
  };
};
