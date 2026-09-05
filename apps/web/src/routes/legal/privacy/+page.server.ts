import type { PageServerLoad } from "./$types.ts";
import { apiJson } from "$lib/server/api.ts";

interface LegalDoc {
  version: string;
  lang: string;
  content: string;
}

export const load: PageServerLoad = async (event) => {
  const lang = event.locals.locale;
  const { data } = await apiJson<LegalDoc>(
    event,
    `/api/legal/privacy?lang=${lang}`,
  );
  return { doc: data };
};
