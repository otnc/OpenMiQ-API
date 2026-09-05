import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.ts";
import { apiJson } from "$lib/server/api.ts";

interface LegalDoc {
  version: string;
  content: string;
}

export const load: PageServerLoad = async (event) => {
  const lang = event.locals.locale;
  const [terms, privacy] = await Promise.all([
    apiJson<LegalDoc>(event, `/api/legal/terms?lang=${lang}`),
    apiJson<LegalDoc>(event, `/api/legal/privacy?lang=${lang}`),
  ]);
  return { terms: terms.data, privacy: privacy.data };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const agree = form.get("agree") === "on";
    const termsVersion = String(form.get("termsVersion") ?? "");
    const privacyVersion = String(form.get("privacyVersion") ?? "");

    if (!agree) {
      return fail(400, { error: "agreement_required" });
    }

    const { status, data } = await apiJson<{ error?: string }>(
      event,
      "/api/console/consent",
      {
        method: "POST",
        body: JSON.stringify({ agree, termsVersion, privacyVersion }),
      },
    );

    if (status !== 200) {
      return fail(status, { error: data?.error ?? "unknown_error" });
    }

    throw redirect(303, "/");
  },
};
