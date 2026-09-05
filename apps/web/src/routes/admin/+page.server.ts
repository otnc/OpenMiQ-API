import { fail, error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types.ts";
import { apiJson } from "$lib/server/api.ts";

export interface AdminApplication {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  discordId: string;
  discordUsername: string;
  status: string;
  maxApiKeys: number | null;
  reconsentRequired: boolean;
}

export interface AdminApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  expiresAt: string | null;
  revokedAt: string | null;
  requestCount: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

export interface AdminBan {
  id: string;
  discordId: string | null;
  reason: string;
}

export interface AdminActionEntry {
  id: string;
  actorDiscordId: string;
  action: string;
  targetUserId: string;
  createdAt: string;
}

export const load: PageServerLoad = async (event) => {
  const [applications, users, bans, auditLog, apiKeys] = await Promise.all([
    apiJson<AdminApplication[]>(
      event,
      "/api/admin/applications?status=pending",
    ),
    apiJson<AdminUser[]>(event, "/api/admin/users"),
    apiJson<AdminBan[]>(event, "/api/admin/bans"),
    apiJson<AdminActionEntry[]>(event, "/api/admin/audit-log"),
    apiJson<AdminApiKey[]>(event, "/api/admin/api-keys"),
  ]);

  if (applications.status === 403) {
    throw error(403, "Forbidden");
  }

  return {
    applications: applications.data ?? [],
    users: users.data ?? [],
    bans: bans.data ?? [],
    auditLog: auditLog.data ?? [],
    apiKeys: apiKeys.data ?? [],
  };
};

export const actions: Actions = {
  approve: async (event) => {
    const id = String((await event.request.formData()).get("id") ?? "");
    await apiJson(event, `/api/admin/applications/${id}/approve`, {
      method: "POST",
    });
    return { error: undefined };
  },
  deny: async (event) => {
    const id = String((await event.request.formData()).get("id") ?? "");
    await apiJson(event, `/api/admin/applications/${id}/deny`, {
      method: "POST",
    });
    return { error: undefined };
  },
  revoke: async (event) => {
    const id = String((await event.request.formData()).get("id") ?? "");
    await apiJson(event, `/api/admin/users/${id}/revoke`, { method: "POST" });
    return { error: undefined };
  },
  ban: async (event) => {
    const form = await event.request.formData();
    const id = String(form.get("id") ?? "");
    const reason = String(form.get("reason") ?? "");
    if (!reason) return fail(400, { error: "reason_required" });
    await apiJson(event, `/api/admin/users/${id}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    return { error: undefined };
  },
  unban: async (event) => {
    const id = String((await event.request.formData()).get("id") ?? "");
    await apiJson(event, `/api/admin/bans/${id}/unban`, { method: "POST" });
    return { error: undefined };
  },
  setMaxApiKeys: async (event) => {
    const form = await event.request.formData();
    const id = String(form.get("id") ?? "");
    const raw = String(form.get("maxApiKeys") ?? "").trim();
    const maxApiKeys = raw === "" ? null : Number(raw);
    if (
      maxApiKeys !== null &&
      (!Number.isInteger(maxApiKeys) || maxApiKeys < 0)
    ) {
      return fail(400, { error: "invalid_max_api_keys" });
    }
    await apiJson(event, `/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ maxApiKeys }),
    });
    return { error: undefined };
  },
  revokeApiKey: async (event) => {
    const id = String((await event.request.formData()).get("id") ?? "");
    await apiJson(event, `/api/admin/api-keys/${id}/revoke`, {
      method: "POST",
    });
    return { error: undefined };
  },
  deleteApiKey: async (event) => {
    const id = String((await event.request.formData()).get("id") ?? "");
    await apiJson(event, `/api/admin/api-keys/${id}`, { method: "DELETE" });
    return { error: undefined };
  },
  deleteAllApiKeys: async (event) => {
    const userId = String((await event.request.formData()).get("userId") ?? "");
    await apiJson(
      event,
      `/api/admin/api-keys?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
    return { error: undefined };
  },
};
