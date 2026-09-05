import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.ts";
import { apiJson } from "$lib/server/api.ts";

interface LegalDoc {
  version: string;
  content: string;
}

interface LegalDiffPart {
  value: string;
  added: boolean;
  removed: boolean;
}

interface LegalDiff {
  fromVersion: string;
  toVersion: string;
  available: boolean;
  parts: LegalDiffPart[];
}

export const load: PageServerLoad = async (event) => {
  const lang = event.locals.locale;
  const parentData = await event.parent();
  const agreedTermsVersion = parentData.me?.agreedTermsVersion ?? null;
  const agreedPrivacyVersion = parentData.me?.agreedPrivacyVersion ?? null;

  const [terms, privacy, termsDiff, privacyDiff] = await Promise.all([
    apiJson<LegalDoc>(event, `/api/legal/terms?lang=${lang}`),
    apiJson<LegalDoc>(event, `/api/legal/privacy?lang=${lang}`),
    agreedTermsVersion
      ? apiJson<LegalDiff>(
          event,
          `/api/legal/terms/diff?from=${agreedTermsVersion}&lang=${lang}`,
        )
      : null,
    agreedPrivacyVersion
      ? apiJson<LegalDiff>(
          event,
          `/api/legal/privacy/diff?from=${agreedPrivacyVersion}&lang=${lang}`,
        )
      : null,
  ]);

  return {
    terms: terms.data,
    privacy: privacy.data,
    termsDiff: termsDiff?.data.available ? termsDiff.data : null,
    privacyDiff: privacyDiff?.data.available ? privacyDiff.data : null,
  };
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
