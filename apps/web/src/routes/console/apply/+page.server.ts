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
    const message = String(form.get("message") ?? "");
    const fingerprint = String(form.get("fingerprint") ?? "");
    const agreedTermsVersion = String(form.get("agreedTermsVersion") ?? "");
    const agreedPrivacyVersion = String(form.get("agreedPrivacyVersion") ?? "");
    const agreeTerms = form.get("agreeTerms") === "on";
    const agreePrivacy = form.get("agreePrivacy") === "on";

    if (!agreeTerms || !agreePrivacy) {
      return fail(400, { error: "agreement_required" });
    }

    const { status, data } = await apiJson(event, "/api/console/applications", {
      method: "POST",
      body: JSON.stringify({
        message,
        fingerprint,
        agreedTermsVersion,
        agreedPrivacyVersion,
      }),
    });

    if (status !== 201) {
      return fail(status, {
        error: (data as { error?: string })?.error ?? "unknown_error",
      });
    }

    throw redirect(303, "/");
  },
};
