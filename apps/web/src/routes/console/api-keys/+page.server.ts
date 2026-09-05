import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.ts";
import { apiJson } from "$lib/server/api.ts";

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  requestCount: number;
  createdAt: string;
  limit: number;
  remaining: number;
  resetAt: string;
}

export const load: PageServerLoad = async (event) => {
  const { data } = await apiJson<ApiKeySummary[]>(
    event,
    "/api/console/api-keys",
  );
  return { keys: data ?? [] };
};

export const actions: Actions = {
  create: async (event) => {
    const form = await event.request.formData();
    const name = String(form.get("name") ?? "").trim();
    if (!name) return fail(400, { error: "name_required" });

    const { status, data } = await apiJson<{
      plaintext?: string;
      error?: string;
    }>(event, "/api/console/api-keys", {
      method: "POST",
      body: JSON.stringify({ name, expiresAt: null }),
    });
    if (status !== 201)
      return fail(status, { error: data?.error ?? "unknown_error" });
    return { created: data.plaintext };
  },

  regenerate: async (event) => {
    const form = await event.request.formData();
    const id = String(form.get("id") ?? "");
    const { status, data } = await apiJson<{
      plaintext?: string;
      error?: string;
    }>(event, `/api/console/api-keys/${id}/regenerate`, { method: "POST" });
    if (status !== 200)
      return fail(status, { error: data?.error ?? "unknown_error" });
    return { created: data.plaintext };
  },

  delete: async (event) => {
    const form = await event.request.formData();
    const id = String(form.get("id") ?? "");
    await apiJson(event, `/api/console/api-keys/${id}`, { method: "DELETE" });
    return {};
  },

  deleteAll: async (event) => {
    await apiJson(event, "/api/console/api-keys", { method: "DELETE" });
    return {};
  },
};
