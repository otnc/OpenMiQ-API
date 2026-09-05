import type { LayoutServerLoad } from "./$types.ts";
import { apiJson } from "$lib/server/api.ts";

export interface ConsoleMe {
  discordId: string;
  discordUsername: string;
  email: string;
  status: "unlinked" | "pending" | "approved" | "denied" | "revoked" | "banned";
  reconsentRequired: boolean;
  termsVersion: string;
  privacyVersion: string;
}

export const load: LayoutServerLoad = async (event) => {
  const { status, data } = await apiJson<ConsoleMe>(event, "/api/console/me");
  return {
    locale: event.locals.locale,
    me: status === 200 ? data : null,
  };
};
