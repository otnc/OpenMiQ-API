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
  reconsentRequired: boolean;
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
  const [applications, users, bans, auditLog] = await Promise.all([
    apiJson<AdminApplication[]>(
      event,
      "/api/admin/applications?status=pending",
    ),
    apiJson<AdminUser[]>(event, "/api/admin/users"),
    apiJson<AdminBan[]>(event, "/api/admin/bans"),
    apiJson<AdminActionEntry[]>(event, "/api/admin/audit-log"),
  ]);

  if (applications.status === 403) {
    throw error(403, "Forbidden");
  }

  return {
    applications: applications.data ?? [],
    users: users.data ?? [],
    bans: bans.data ?? [],
    auditLog: auditLog.data ?? [],
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
};
